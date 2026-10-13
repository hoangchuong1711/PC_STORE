package com.pcstore.service;

import com.pcstore.dto.BuilderCatalogDto.Product;
import com.pcstore.dto.CompatibilityDto.*;
import com.pcstore.dto.RecommendationDto.*;
import com.pcstore.entity.enums.ComponentType;
import java.math.BigDecimal;
import java.util.*;

/** One unit/kit per group. No DB or AI calls inside the bounded search. */
public final class RecommendationSearch {
    private static final List<String> ORDER=List.of("CPU","MOTHERBOARD","RAM","GPU","STORAGE","COOLER","CASE","PSU");
    private final long maxNodes, maxMillis;
    public RecommendationSearch(long maxNodes,long maxMillis) {
        if(maxNodes<1 || maxMillis<1) throw new IllegalArgumentException("Positive search limits required");
        this.maxNodes=maxNodes; this.maxMillis=maxMillis;
    }
    public SearchResult find(List<Product> catalog,Criteria criteria,BigDecimal budget) {
        Criteria valid=RecommendationCriteria.validateForSearch(criteria);
        var preferred=new Search(catalog,valid,budget,true); preferred.run();
        if(!preferred.best.isEmpty() || preferred.limited) return preferred.result("PREFERRED");
        var minimum=new Search(catalog,valid,budget,false); minimum.run();
        return minimum.result("MINIMUM");
    }
    public static Part part(Product p) {
        Map<String,List<String>> support=new HashMap<>();
        for(var mapping:Map.of("supportedSockets","supportedSocketCodes","supportedFormFactors","supportedFormFactorCodes").entrySet()) {
            Object values=p.spec().get(mapping.getKey());
            if(values instanceof List<?> list && list.stream().allMatch(String.class::isInstance))
                support.put(mapping.getValue(),list.stream().map(String.class::cast).toList());
        }
        return new Part(ComponentType.valueOf(p.componentType()),1,p.spec(),support);
    }
    private final class Search {
        final List<List<Product>> groups=new ArrayList<>();
        final BigDecimal[] lower=new BigDecimal[9], upper=new BigDecimal[9];
        final BigDecimal budget;
        final long deadline=System.nanoTime()+maxMillis*1_000_000;
        List<Product> best=List.of(); BigDecimal total=BigDecimal.ZERO;
        boolean limited; long nodes;
        Search(List<Product> catalog,Criteria c,BigDecimal budget,boolean preferred) {
            this.budget=budget;
            for(String type:ORDER) {
                groups.add(catalog.stream().filter(p->type.equals(p.componentType()) && p.availableQuantity()>0
                    && p.price()!=null && p.price().signum()>=0 && p.spec()!=null && !p.spec().isEmpty()
                    && c.thresholds().stream().filter(t->t.componentType().equals(type)).allMatch(t->{
                        Object value=p.spec().get(t.field());
                        return value instanceof Number n && Double.isFinite(n.doubleValue())
                            && n.doubleValue()>=(preferred?t.preferred():t.minimum());
                    })).sorted(Comparator.comparing(Product::price).reversed().thenComparingInt(Product::productId)).toList());
            }
        }
        void run() {
            if(groups.stream().anyMatch(List::isEmpty)) return;
            lower[8]=upper[8]=BigDecimal.ZERO;
            for(int i=7;i>=0;i--) {
                lower[i]=lower[i+1].add(groups.get(i).getLast().price());
                upper[i]=upper[i+1].add(groups.get(i).getFirst().price());
            }
            dfs(new ArrayList<>(),new ArrayList<>(),BigDecimal.ZERO);
        }
        void dfs(List<Product> selected,List<Part> parts,BigDecimal price) {
            if(total.compareTo(budget)==0 && !best.isEmpty()) return;
            if(nodes>=maxNodes || System.nanoTime()>=deadline || Thread.currentThread().isInterrupted()) { limited=true; return; }
            nodes++;
            int depth=selected.size();
            if(price.add(lower[depth]).compareTo(budget)>0) return;
            if(!best.isEmpty() && price.add(upper[depth]).compareTo(total)<=0) return;
            var report=CompatibilityRules.evaluate(parts);
            if(report.status()==Status.FAIL) return;
            if(depth==8) {
                if(report.status()==Status.PASS && (best.isEmpty() || price.compareTo(total)>0)) {
                    best=List.copyOf(selected); total=price;
                }
                return;
            }
            for(Product p:groups.get(depth)) {
                if(price.add(p.price()).compareTo(budget)>0) continue;
                selected.add(p); parts.add(part(p)); dfs(selected,parts,price.add(p.price()));
                selected.removeLast(); parts.removeLast();
                if(limited || (!best.isEmpty() && total.compareTo(budget)==0)) return;
            }
        }
        SearchResult result(String level) { return new SearchResult(best,total,level,limited,nodes); }
    }
}
