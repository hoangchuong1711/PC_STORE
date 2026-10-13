package com.pcstore.service;

import com.pcstore.dto.RecommendationDto.*;
import com.pcstore.exception.AppException;
import java.math.BigDecimal;
import java.util.*;

public final class RecommendationCriteria {
    private RecommendationCriteria() {}
    public static final Map<String, Set<String>> FIELDS = Map.of(
        "CPU",Set.of("cores","threads"), "GPU",Set.of("vramGb"),
        "RAM",Set.of("capacityGb","speedMhz"),
        "STORAGE",Set.of("capacityGb","readSpeedMBps","writeSpeedMBps"));
    private static final Set<String> REQUIRED_THRESHOLDS = Set.of(
        "CPU.cores", "CPU.threads", "GPU.vramGb", "RAM.capacityGb", "STORAGE.capacityGb");
    public static final Set<String> PURPOSES = Set.of("OFFICE_STUDY","PROGRAMMING","GAMING","STREAMING",
        "VIDEO_EDITING","DESIGN_2D_3D","AI_ML","ARCHITECTURE_RENDER","OTHER");
    public static Answers validateAnswers(Answers a) {
        if(a==null || a.pcBudget()==null || a.pcBudget().signum()<=0 || a.pcBudget().scale()>0
            || a.pcBudget().compareTo(new BigDecimal("1000000000"))>0
            || a.purposes()==null || a.purposes().isEmpty() || a.purposes().size()>PURPOSES.size()
            || a.purposes().stream().anyMatch(p->p==null || !PURPOSES.contains(p))
            || new HashSet<>(a.purposes()).size()!=a.purposes().size()
            || a.softwareText()==null || a.softwareText().isBlank() || a.minStorageGb()<0 || a.minStorageGb()>100000
            || (a.targetFps()!=null && (a.targetFps()<1 || a.targetFps()>1000)))
            throw new AppException(400,"INVALID_RECOMMENDATION","Ngân sách, mục đích, ứng dụng hoặc dung lượng không hợp lệ.");
        return new Answers(a.pcBudget(),List.copyOf(a.purposes()),text(a.purposeNotes(),2000),
            text(a.softwareText(),2000),text(a.gamesText(),1000),text(a.targetResolution(),100),a.targetFps(),a.minStorageGb());
    }
    private static String text(String s,int max) {
        if(s==null || s.isBlank()) return null;
        if(s.length()>max) throw new AppException(400,"INVALID_RECOMMENDATION","Câu trả lời quá dài.");
        return s.trim();
    }
    public static Criteria validate(Criteria c,int storageFloor) {
        return validateInternal(c,storageFloor);
    }
    static Criteria validateForSearch(Criteria c) {
        return validateInternal(c,0);
    }
    static Criteria validateAiCriteria(Criteria c,int storageFloor) {
        Criteria validated=validateInternal(c,storageFloor);
        var keys=validated.thresholds().stream()
            .map(t->t.componentType()+"."+t.field()).collect(java.util.stream.Collectors.toSet());
        if(!keys.containsAll(REQUIRED_THRESHOLDS)) throw invalid();
        return validated;
    }
    private static Criteria validateInternal(Criteria c,int storageFloor) {
        if(c==null || c.thresholds()==null || c.thresholds().isEmpty() || c.thresholds().size()>8
                || c.assumptions()==null || c.assumptions().size()>6) throw invalid();
        var keys=new HashSet<String>(); var thresholds=new ArrayList<Threshold>();
        for(var t:c.thresholds()) {
            if(t==null || t.componentType()==null || t.field()==null
                    || !FIELDS.getOrDefault(t.componentType(),Set.of()).contains(t.field())
                    || !keys.add(t.componentType()+"."+t.field()) || t.minimum()<1
                    || t.preferred()<t.minimum() || t.preferred()>100000) throw invalid();
            int minimum=t.minimum(), preferred=t.preferred();
            if(t.componentType().equals("STORAGE") && t.field().equals("capacityGb")) {
                minimum=Math.max(minimum,storageFloor); preferred=Math.max(preferred,minimum);
            }
            thresholds.add(new Threshold(t.componentType(),t.field(),minimum,preferred));
        }
        if(storageFloor>0 && !keys.contains("STORAGE.capacityGb"))
            thresholds.add(new Threshold("STORAGE","capacityGb",storageFloor,storageFloor));
        if(c.assumptions().stream().anyMatch(s->s==null || s.length()>500)) throw invalid();
        return new Criteria(List.copyOf(thresholds),List.copyOf(c.assumptions()));
    }
    private static AppException invalid() { return new AppException(502,"AI_INVALID_CRITERIA","AI trả tiêu chí không hợp lệ. Hãy thử lại."); }
}
