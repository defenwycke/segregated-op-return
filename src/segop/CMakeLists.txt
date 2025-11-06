# SegOP module
add_library(segop STATIC segop.cpp)

# Ensure it’s compiled as C++
set_target_properties(segop PROPERTIES LINKER_LANGUAGE CXX)

# Make headers visible to the rest of the project
target_include_directories(segop PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/..)
