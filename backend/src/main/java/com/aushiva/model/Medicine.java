package com.aushiva.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "medicines")
@Data
public class Medicine {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(unique = true, nullable = false)
    private String barcode;

    private String batchNumber;
    private String manufacturer;
    private Integer quantity;
    private LocalDate expiryDate;

    @Column(name = "hospital_id")
    private Long hospitalId;

    private Boolean isExcess = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}
