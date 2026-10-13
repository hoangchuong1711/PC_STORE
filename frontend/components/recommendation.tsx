"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Header, Footer } from "./storefront";
import { useAuth } from "./auth-provider";
import { useCart } from "./cart-provider";
import { formatPrice } from "../lib/products";
import { recommendationApi, type Recommendation, type RecommendationAnswers } from "../lib/recommendation-api";
import "./recommendation.css";

const purposes: Record<string,string>={OFFICE_STUDY:"Học tập / văn phòng",PROGRAMMING:"Lập trình",GAMING:"Chơi game",STREAMING:"Livestream",
  VIDEO_EDITING:"Dựng video",DESIGN_2D_3D:"Thiết kế 2D / 3D",AI_ML:"AI / học máy",ARCHITECTURE_RENDER:"Kiến trúc / render",OTHER:"Khác"};
const names: Record<string,string>={CPU:"CPU",MOTHERBOARD:"Mainboard",RAM:"RAM",GPU:"Card đồ họa",STORAGE:"Ổ lưu trữ",COOLER:"Tản nhiệt",CASE:"Vỏ máy",PSU:"Nguồn"};
const fields: Record<string,string>={cores:"Số nhân",threads:"Số luồng",vramGb:"VRAM (GB)",capacityGb:"Dung lượng (GB)",speedMhz:"Tốc độ (MHz)",readSpeedMBps:"Đọc (MB/s)",writeSpeedMBps:"Ghi (MB/s)"};
const initial: RecommendationAnswers={pcBudget:20000000,purposes:[],purposeNotes:"",softwareText:"",gamesText:"",targetResolution:null,targetFps:null,minStorageGb:500};

export function RecommendationPage() {
  const {user,loading}=useAuth(); const {acceptServerCart}=useCart(); const router=useRouter();
  const [answers,setAnswers]=useState(initial);
  const [request,setRequest]=useState<{id:number;owner:number}|null>(null);
  const [response,setResponse]=useState<{data:Recommendation;owner:number}|null>(null);
  const [error,setError]=useState(""); const [submitting,setSubmitting]=useState(false);
  const [action,setAction]=useState(false); const [revision,setRevision]=useState(0);
  const [pollError,setPollError]=useState("");
  const userId=user?.userId;
  const data=response?.owner===user?.userId?response?.data:null;
  const currentRequest=request?.owner===user?.userId?request:null;
  const pending=!!currentRequest && (!data || data.status==="QUEUED" || data.status==="PROCESSING");
  const result=data?.result;

  useEffect(()=>{
    if(!userId) return;
    const id=Number(new URL(window.location.href).searchParams.get("request"));
    if(!Number.isInteger(id) || id<1) return;
    let cancelled=false;
    recommendationApi.get(id).then(value=>{
      if(!cancelled) {setResponse({data:value,owner:userId});setRequest({id,owner:userId});setAnswers(value.answers);}
    }).catch(e=>{if(!cancelled)setError(e.message);});
    return ()=>{cancelled=true;};
  },[userId]); // Restore only when the account changes.

  useEffect(()=>{
    if(!currentRequest || !pending) return;
    let cancelled=false; let timer: ReturnType<typeof setTimeout>;
    const owner=currentRequest.owner, id=currentRequest.id;
    async function poll() {
      try {
        const value=await recommendationApi.get(id);
        if(cancelled)return;
        setResponse({data:value,owner});setPollError("");
        if(value.status==="QUEUED" || value.status==="PROCESSING") timer=setTimeout(poll,1500);
      } catch(e) {if(!cancelled)setPollError(e instanceof Error?e.message:"Không thể đọc kết quả.");}
    }
    void poll(); return ()=>{cancelled=true;clearTimeout(timer);};
  },[currentRequest,pending,revision]);

  function change<K extends keyof RecommendationAnswers>(key:K,value:RecommendationAnswers[K]) {setAnswers(a=>({...a,[key]:value}));}
  async function submit(event:FormEvent) {
    event.preventDefault(); if(!user || pending || submitting)return;
    if(!answers.purposes.length){setError("Hãy chọn ít nhất một nhu cầu sử dụng.");return;}
    setSubmitting(true);setError("");setPollError("");setRequest(null);setResponse(null);
    window.history.replaceState(null,"","/recommendation");
    try {
      const created=await recommendationApi.create(answers);
      setRequest({id:created.requestId,owner:user.userId});
      window.history.replaceState(null,"",`/recommendation?request=${created.requestId}`);
    } catch(e) {setError(e instanceof Error?e.message:"Không thể gửi yêu cầu.");}
    finally {setSubmitting(false);}
  }
  async function purchase(copy:boolean) {
    if(!data || action)return;setAction(true);setError("");
    try {
      if(copy) {await recommendationApi.copy(data.requestId);router.push("/builder");}
      else {acceptServerCart(await recommendationApi.cart(data.requestId));router.push("/cart");}
    } catch(e) {setError(e instanceof Error?e.message:"Không thể thực hiện.");}
    finally {setAction(false);}
  }
  function reset() {setRequest(null);setResponse(null);setError("");setPollError("");window.history.replaceState(null,"","/recommendation");}

  return <><Header/><main className="container recommendation-page">
    <div className="rec-intro"><div><p className="rec-kicker">PC Store / Tư vấn cấu hình</p><h1>Tìm PC theo nhu cầu của bạn</h1>
      <p>Cho chúng tôi biết bạn thường làm gì. Nhận một cấu hình từ linh kiện đang bán, trong ngân sách bạn chọn.</p></div>
      <Link href="/builder" className="button button-outline">Tự chọn linh kiện</Link></div>
    {loading?<p role="status">Đang kiểm tra tài khoản…</p>:!user?<div className="rec-notice"><h2>Đăng nhập để lưu kết quả tư vấn</h2><p>Cấu hình của bạn sẽ được lưu để xem lại và thêm vào giỏ hàng.</p><Link className="button button-primary" href="/auth/login">Đăng nhập</Link></div>
      :user.role!=="CUSTOMER"?<p className="rec-notice">Tính năng này dành cho tài khoản khách hàng.</p>:<>
    {error && <p className="rec-error" role="alert">{error}</p>}
    {pending || submitting?<section className="rec-notice" aria-live="polite"><h2>Đang tìm cấu hình phù hợp</h2>
      <p>{data?.status==="PROCESSING"?"Đang phân tích nhu cầu và kiểm tra các tổ hợp linh kiện…":"Yêu cầu đang được xử lý. Bạn có thể giữ trang này để nhận kết quả."}</p>
      <p>Thông thường cần vài chục giây. Nếu quá hạn, bạn có thể tạo lượt tư vấn mới.</p>
      {pollError && <div role="alert"><p>{pollError}</p><button className="button button-outline" onClick={()=>setRevision(x=>x+1)}>Đọc lại kết quả</button></div>}
    </section>:result?<section className="rec-result">
      <div className="rec-result-header"><div><p className="rec-kicker">{result.level==="PREFERRED"?"Đạt mức mong muốn":"Đạt mức tối thiểu"}</p><h2>Cấu hình đề xuất</h2><p>{result.reason}</p></div><button className="button button-outline" onClick={reset}>Điều chỉnh nhu cầu</button></div>
      {result.searchLimited && <p className="rec-notice">Đã hết giới hạn tìm kiếm. Đây là bộ sát ngân sách nhất trong những phương án đã xét, chưa bảo đảm tối ưu toàn bộ kho.</p>}
      <div className="rec-result-grid"><div className="rec-parts">{result.products.map(p=><article key={p.productId} className="rec-part"><span>{names[p.componentType]??p.componentType}</span><div><h3>{p.name}</h3>
        <p>{p.availableQuantity>0?"Còn hàng":"Hiện không khả dụng"} · Số lượng: 1</p><details><summary>Thông số sản phẩm</summary><dl>{Object.entries(p.spec??{}).map(([key,value])=><div key={key}><dt>{fields[key]??key}</dt><dd>{Array.isArray(value)?value.join(", "):String(value)}</dd></div>)}</dl></details></div><strong>{formatPrice(p.price)}</strong></article>)}</div>
      <aside className="rec-summary"><h3>Chi phí cấu hình</h3><dl><div><dt>Ngân sách</dt><dd>{formatPrice(data.answers.pcBudget)}</dd></div><div><dt>Lúc tư vấn</dt><dd>{formatPrice(result.estimatedTotal)}</dd></div><div><dt>Giá hiện tại</dt><dd>{formatPrice(result.build.totalAmount)}</dd></div><div><dt>Còn lại theo giá hiện tại</dt><dd>{formatPrice(data.answers.pcBudget-result.build.totalAmount)}</dd></div></dl>
        <button className="button button-primary" disabled={action || result.build.compatibility.status!=="PASS" || result.products.some(p=>p.availableQuantity<1)} onClick={()=>purchase(false)}>{action?"Đang xử lý…":"Thêm cấu hình vào giỏ"}</button>
        <button className="button button-outline" disabled={action} onClick={()=>purchase(true)}>Sao chép sang Builder</button><p>Bản sao nằm trong danh sách cấu hình đã lưu của PC Builder. Giá và tồn kho được kiểm tra lại khi mua.</p></aside></div>
      <details className="rec-details"><summary>Tiêu chí đã dùng để lựa chọn</summary><div className="rec-table"><table><thead><tr><th>Linh kiện</th><th>Tiêu chí</th><th>Tối thiểu</th><th>Mong muốn</th></tr></thead><tbody>{data.criteria?.thresholds.map(t=><tr key={`${t.componentType}.${t.field}`}><td>{names[t.componentType]}</td><td>{fields[t.field]??t.field}</td><td>{t.minimum}</td><td>{t.preferred}</td></tr>)}</tbody></table></div>{data.criteria?.assumptions.map((text,i)=><p key={i}>{text}</p>)}</details>
      <details className="rec-details"><summary>Kết quả kiểm tra tương thích hiện tại: {result.build.compatibility.status}</summary><ul>{result.build.compatibility.rules.map(rule=><li key={rule.id}>{rule.status}: {rule.reason}</li>)}</ul></details>
      <p className="rec-disclaimer">Đã kiểm tra các quy tắc cơ bản của Builder. Chưa xác nhận BIOS, đầu cấp nguồn, cổng lưu trữ và điện năng toàn hệ thống. Tiêu chí AI không phải benchmark và không cam kết FPS.</p>
    </section>:<div className="rec-layout"><form onSubmit={submit} className="rec-form">
      {data?.status==="FAILED" && <div role="alert" className="rec-error"><strong>Chưa tạo được cấu hình</strong><p>{data.failureReason}</p></div>}
      <fieldset><legend>Ngân sách và nhu cầu</legend><label>Ngân sách tối đa (đ)<input type="number" min="1" max="1000000000" step="1" required value={answers.pcBudget||""} onChange={e=>change("pcBudget",Number(e.target.value))}/></label><p className="rec-help">Chỉ dành cho thùng máy, chưa gồm màn hình, bàn phím và chuột.</p>
        <div className="rec-choices">{Object.entries(purposes).map(([value,label])=><label key={value}><input type="checkbox" checked={answers.purposes.includes(value)} onChange={e=>change("purposes",e.target.checked?[...answers.purposes,value]:answers.purposes.filter(x=>x!==value))}/>{label}</label>)}</div>
        <label>Công việc và mức độ sử dụng<textarea maxLength={2000} rows={3} placeholder="Ví dụ: học lập trình, mở IDE và nhiều tab trình duyệt cùng lúc…" value={answers.purposeNotes??""} onChange={e=>change("purposeNotes",e.target.value)}/></label>
        <label>Ứng dụng và website thường dùng<textarea required maxLength={2000} rows={3} placeholder="Tên ứng dụng, website; thường chạy đồng thời những gì. Ghi ‘không có’ nếu chưa xác định." value={answers.softwareText} onChange={e=>change("softwareText",e.target.value)}/></label></fieldset>
      {answers.purposes.includes("GAMING") && <fieldset><legend>Nhu cầu chơi game</legend><label>Game thường chơi<input maxLength={1000} value={answers.gamesText??""} onChange={e=>change("gamesText",e.target.value)}/></label><div className="rec-pair"><label>Độ phân giải<select value={answers.targetResolution??""} onChange={e=>change("targetResolution",e.target.value||null)}><option value="">Chưa xác định</option><option>1080p</option><option>1440p</option><option>4K</option></select></label><label>FPS mong muốn<input type="number" min="1" max="1000" value={answers.targetFps??""} onChange={e=>change("targetFps",e.target.value?Number(e.target.value):null)}/></label></div></fieldset>}
      <fieldset><legend>Dung lượng lưu trữ</legend><label>Dung lượng tối thiểu (GB)<input type="number" min="0" max="100000" step="1" required value={answers.minStorageGb} onChange={e=>change("minStorageGb",Number(e.target.value))}/></label><p className="rec-help">Nhập 0 nếu muốn hệ thống đề xuất theo nhu cầu.</p></fieldset>
      <p className="rec-help">Nội dung câu trả lời được gửi tới Gemini để phân tích. Không nhập thông tin cá nhân hoặc dữ liệu nhạy cảm.</p><button className="button button-primary rec-submit" type="submit">Tìm cấu hình phù hợp</button>
    </form><aside className="rec-guide"><h2>Từ nhu cầu đến cấu hình</h2><ol><li><strong>Kể về cách bạn dùng máy</strong><p>Không cần biết socket hay cách ghép linh kiện.</p></li><li><strong>Tìm linh kiện trong cửa hàng</strong><p>Ưu tiên mức mong muốn. Nếu không đủ ngân sách, thử mức tối thiểu.</p></li><li><strong>Nhận một bộ PC để cân nhắc</strong><p>Chọn tổng giá sát ngân sách nhất trong các phương án đạt kiểm tra.</p></li></ol><p>Bản đầu tư vấn máy mua mới với GPU rời, một bộ RAM, một ổ lưu trữ và tản khí. Chưa tính linh kiện bạn đã có.</p><Link href="/builder">Bạn đã biết cần mua gì? Mở PC Builder</Link></aside></div>}
    </>}
  </main><Footer/></>;
}
