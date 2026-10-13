package com.pcstore.service;
import com.pcstore.dto.RecommendationDto.*;
@FunctionalInterface
public interface CriteriaProvider { Criteria generate(Answers answers); }
