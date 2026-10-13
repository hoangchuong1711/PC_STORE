package com.pcstore.service;

import com.pcstore.dto.BuilderCatalogDto.Product;
import com.pcstore.dto.RecommendationDto.*;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class RecommendationSearchTest {
    static Criteria criteria(int minimum, int preferred) {
        return new Criteria(List.of(new Threshold("RAM", "capacityGb", minimum, preferred)), List.of());
    }
    static Product product(int id, String type, int price, Map<String,Object> spec) {
        return new Product(id, type + id, "Test", type, BigDecimal.valueOf(price), 5, null, spec);
    }
    static List<Product> catalog() {
        return new ArrayList<>(List.of(
            product(1,"CPU",100,Map.of("socketCode","A","cores",6,"threads",12)),
            product(2,"MOTHERBOARD",100,Map.of("socketCode","A","ramType","DDR4","ramSlots",4,"maxRamGb",128,"formFactorCode","ATX")),
            product(3,"RAM",100,Map.of("ramType","DDR4","capacityGb",16,"moduleCount",1)),
            product(4,"GPU",100,Map.of("lengthMm",200,"recommendedPsuW",500,"vramGb",8)),
            product(5,"STORAGE",100,Map.of("capacityGb",1000)),
            product(6,"COOLER",100,Map.of("coolerType","AIR","heightMm",140,"supportedSockets",List.of("A"))),
            product(7,"CASE",100,Map.of("maxGpuLengthMm",300,"maxCoolerHeightMm",160,"supportedFormFactors",List.of("ATX"))),
            product(8,"PSU",100,Map.of("wattage",600))));
    }
    @Test void searchesBeyondFirstBuildAndNeverExceedsBudget() {
        var rows=catalog(); rows.add(product(9,"CPU",180,Map.of("socketCode","A")));
        rows.add(product(10,"CPU",250,Map.of("socketCode","A")));
        var result=new RecommendationSearch(10000,5000).find(rows,criteria(16,16),BigDecimal.valueOf(900));
        assertEquals(new BigDecimal("880"),result.total());
        assertTrue(result.products().stream().anyMatch(p->p.productId()==9));
    }
    @Test void backtracksFromIncompatibleCpu() {
        var rows=catalog(); rows.addFirst(product(9,"CPU",190,Map.of("socketCode","B")));
        assertEquals(new BigDecimal("800"),new RecommendationSearch(10000,5000).find(rows,criteria(16,16),BigDecimal.valueOf(900)).total());
    }
    @Test void prefersDesiredLevelBeforeCloserMinimumBuild() {
        var rows=catalog(); rows.add(product(9,"RAM",80,Map.of("ramType","DDR4","capacityGb",32,"moduleCount",2)));
        var result=new RecommendationSearch(10000,5000).find(rows,criteria(16,32),BigDecimal.valueOf(810));
        assertEquals("PREFERRED",result.level()); assertEquals(new BigDecimal("780"),result.total());
    }
    @Test void fallsBackWithoutDroppingMinimum() {
        var result=new RecommendationSearch(10000,5000).find(catalog(),criteria(16,32),BigDecimal.valueOf(900));
        assertEquals("MINIMUM",result.level());
        assertTrue(new RecommendationSearch(10000,5000).find(catalog(),criteria(32,64),BigDecimal.valueOf(900)).products().isEmpty());
    }
    @Test void refusesUnknownCompatibilityAndUnavailableStock() {
        var rows=catalog(); rows.set(5,product(6,"COOLER",100,Map.of("coolerType","AIO","supportedSockets",List.of("A"))));
        assertTrue(new RecommendationSearch(10000,5000).find(rows,criteria(16,16),BigDecimal.valueOf(900)).products().isEmpty());
        rows=catalog(); var p=rows.getFirst(); rows.set(0,new Product(p.productId(),p.name(),p.brand(),p.componentType(),p.price(),0,null,p.spec()));
        assertTrue(new RecommendationSearch(10000,5000).find(rows,criteria(16,16),BigDecimal.valueOf(900)).products().isEmpty());
    }
    @Test void boundedSearchReportsLimitInsteadOfInfeasibility() {
        var result=new RecommendationSearch(1,5000).find(catalog(),criteria(16,16),BigDecimal.valueOf(900));
        assertTrue(result.limited()); assertTrue(result.products().isEmpty());
    }
    @Test void rejectsAiCompatibilityFieldsAndReversedThresholds() {
        assertThrows(RuntimeException.class,()->RecommendationCriteria.validate(new Criteria(List.of(new Threshold("CPU","socketCode",1,2)),List.of()),0));
        assertThrows(RuntimeException.class,()->RecommendationCriteria.validate(criteria(32,16),0));
    }
    @Test void userStorageMinimumCannotBeRelaxedByAi() {
        var c=RecommendationCriteria.validate(criteria(16,16),2000);
        assertTrue(new RecommendationSearch(10000,5000).find(catalog(),c,BigDecimal.valueOf(900)).products().isEmpty());
    }
}
