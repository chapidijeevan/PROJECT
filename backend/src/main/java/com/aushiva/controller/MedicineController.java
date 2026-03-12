package com.aushiva.controller;

import com.aushiva.model.Medicine;
import com.aushiva.repository.MedicineRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/medicines")
public class MedicineController {

    @Autowired
    private MedicineRepository medicineRepository;

    @GetMapping
    public List<Medicine> getAllMedicines() {
        return medicineRepository.findAll();
    }

    @GetMapping("/barcode/{barcode}")
    public ResponseEntity<Medicine> getByBarcode(@PathVariable String barcode) {
        return medicineRepository.findByBarcode(barcode)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Medicine addMedicine(@RequestBody Medicine medicine) {
        return medicineRepository.save(medicine);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Medicine> updateMedicine(@PathVariable Long id, @RequestBody Medicine details) {
        return medicineRepository.findById(id).map(medicine -> {
            medicine.setQuantity(details.getQuantity());
            medicine.setIsExcess(details.getIsExcess());
            return ResponseEntity.ok(medicineRepository.save(medicine));
        }).orElse(ResponseEntity.notFound().build());
    }
}
