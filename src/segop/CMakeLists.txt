# src/segop/CMakeLists.txt
add_library(segop STATIC
    segop.cpp
    segop_prune.cpp
    buds.cpp
    segop_buds_registry.cpp
    segop_extract_surfaces.cpp
    segop_buds_classify.cpp
)

set_target_properties(segop PROPERTIES LINKER_LANGUAGE CXX)
target_include_directories(segop PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/..)
