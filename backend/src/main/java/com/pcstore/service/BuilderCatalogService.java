package com.pcstore.service;

import com.pcstore.dao.ProductDao;
import com.pcstore.dao.ProductSpecDao;
import com.pcstore.dto.BuilderCatalogDto;
import com.pcstore.dto.CompatibilityDto;
import com.pcstore.entity.Product;
import com.pcstore.entity.ProductImage;
import com.pcstore.exception.ResourceNotFoundException;
import jakarta.persistence.EntityManager;

import java.util.List;

/** Public Builder catalog and preview. Purchase still goes through BuildService. */
public class BuilderCatalogService {
    private final ProductDao products;
    private final ProductSpecDao specs;
    private final CompatibilityService compatibility;

    public BuilderCatalogService(EntityManager em) {
        products = new ProductDao(em);
        specs = new ProductSpecDao(em);
        compatibility = new CompatibilityService(em);
    }

    public List<BuilderCatalogDto.Product> products() {
        List<Product> rows = products.findPublicBuilderProducts();
        var quantities = products.availableQuantities(rows.stream().map(Product::getProductId).toList());
        return rows.stream().map(product -> new BuilderCatalogDto.Product(
                product.getProductId(), product.getName(), product.getBrand().getName(),
                product.getCategory().getComponentType().name(), product.getPrice(),
                quantities.getOrDefault(product.getProductId(), 0),
                product.getImages().stream().findFirst().map(ProductImage::getImageUrl).orElse(null),
                specs.find(product.getProductId(), product.getCategory().getComponentType()))).toList();
    }

    public CompatibilityDto.Report preview(List<CompatibilityDto.Selection> items) {
        for (CompatibilityDto.Selection item : items) {
            Product product = products.findPublic(item.productId());
            if (product == null || product.getCategory().getComponentType() == null)
                throw new ResourceNotFoundException("Linh kiện không còn trong catalog Builder.");
        }
        return compatibility.evaluate(items);
    }
}
