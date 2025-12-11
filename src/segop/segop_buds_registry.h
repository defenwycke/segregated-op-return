#pragma once
#include <cstdint>
#include <string>
#include <vector>
#include <map>

namespace segop {

// A single BUDS label entry from the registry.
struct SegopBudsLabel {
    std::string label;
    std::string description;
    std::vector<std::string> surfaces;
    std::string suggested_tier; // "T0".."T3"
};

// BUDS Registry API
const std::vector<SegopBudsLabel>& GetBudsRegistry();

// Fast lookup by label string
const SegopBudsLabel* FindBudsLabel(const std::string& label);

// ARBDA conversion
uint8_t TierStringToCode(const std::string& tier);

} // namespace segop
