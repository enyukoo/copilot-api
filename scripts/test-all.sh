#!/bin/bash

# Test runner script for copilot-api project
# Runs all test categories with detailed reporting

set -e

echo "🧪 Running Copilot API Test Suite"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to run tests with category reporting
run_test_category() {
    local category=$1
    local test_files=$2
    local description=$3
    
    echo ""
    echo -e "${BLUE}📋 Running $category Tests${NC}"
    echo -e "${BLUE}Description: $description${NC}"
    echo "---"
    
    if npm test -- $test_files; then
        echo -e "${GREEN}✅ $category tests passed${NC}"
        return 0
    else
        echo -e "${RED}❌ $category tests failed${NC}"
        return 1
    fi
}

# Track test results
PASSED_CATEGORIES=()
FAILED_CATEGORIES=()

# Unit Tests
echo -e "${YELLOW}🔬 UNIT TESTS${NC}"
echo "Testing individual components and functions in isolation"

if run_test_category "Validation" "tests/unit/validation.test.ts" "Request validation and input sanitization"; then
    PASSED_CATEGORIES+=("Unit: Validation")
else
    FAILED_CATEGORIES+=("Unit: Validation")
fi

if run_test_category "Error Handling" "tests/unit/error.test.ts" "Error handling and recovery mechanisms"; then
    PASSED_CATEGORIES+=("Unit: Error Handling")
else
    FAILED_CATEGORIES+=("Unit: Error Handling")
fi

if run_test_category "Configuration" "tests/unit/config.test.ts" "Configuration management and validation"; then
    PASSED_CATEGORIES+=("Unit: Configuration")
else
    FAILED_CATEGORIES+=("Unit: Configuration")
fi

if run_test_category "Monitoring" "tests/unit/monitoring.test.ts" "Performance monitoring and metrics collection"; then
    PASSED_CATEGORIES+=("Unit: Monitoring")
else
    FAILED_CATEGORIES+=("Unit: Monitoring")
fi

if run_test_category "Security" "tests/unit/security.test.ts" "Security validations and vulnerability testing"; then
    PASSED_CATEGORIES+=("Unit: Security")
else
    FAILED_CATEGORIES+=("Unit: Security")
fi

if run_test_category "Performance" "tests/unit/performance.test.ts" "Performance benchmarks and load testing"; then
    PASSED_CATEGORIES+=("Unit: Performance")
else
    FAILED_CATEGORIES+=("Unit: Performance")
fi

# Integration Tests
echo ""
echo -e "${YELLOW}🔗 INTEGRATION TESTS${NC}"
echo "Testing component interactions and workflows"

if run_test_category "API Integration" "tests/integration/api.test.ts" "End-to-end API workflows and component integration"; then
    PASSED_CATEGORIES+=("Integration: API")
else
    FAILED_CATEGORIES+=("Integration: API")
fi

# Core Tests (existing)
echo ""
echo -e "${YELLOW}⚙️ CORE FUNCTIONALITY TESTS${NC}"
echo "Testing core business logic and translations"

if run_test_category "Anthropic Response Translation" "tests/anthropic-response.test.ts" "OpenAI to Anthropic response translation"; then
    PASSED_CATEGORIES+=("Core: Anthropic Response")
else
    FAILED_CATEGORIES+=("Core: Anthropic Response")
fi

if run_test_category "Anthropic Request Translation" "tests/anthropic-request.test.ts" "Anthropic to OpenAI request translation"; then
    PASSED_CATEGORIES+=("Core: Anthropic Request")
else
    FAILED_CATEGORIES+=("Core: Anthropic Request")
fi

if run_test_category "Chat Completions" "tests/create-chat-completions.test.ts" "Chat completion creation and processing"; then
    PASSED_CATEGORIES+=("Core: Chat Completions")
else
    FAILED_CATEGORIES+=("Core: Chat Completions")
fi

# Final Report
echo ""
echo "🏁 TEST SUMMARY"
echo "==============="

total_categories=$((${#PASSED_CATEGORIES[@]} + ${#FAILED_CATEGORIES[@]}))
passed_count=${#PASSED_CATEGORIES[@]}
failed_count=${#FAILED_CATEGORIES[@]}

echo "Total test categories: $total_categories"
echo -e "${GREEN}Passed: $passed_count${NC}"
echo -e "${RED}Failed: $failed_count${NC}"

if [ ${#PASSED_CATEGORIES[@]} -gt 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Passed Categories:${NC}"
    for category in "${PASSED_CATEGORIES[@]}"; do
        echo "  - $category"
    done
fi

if [ ${#FAILED_CATEGORIES[@]} -gt 0 ]; then
    echo ""
    echo -e "${RED}❌ Failed Categories:${NC}"
    for category in "${FAILED_CATEGORIES[@]}"; do
        echo "  - $category"
    done
fi

# Calculate success rate
if [ $total_categories -gt 0 ]; then
    success_rate=$((passed_count * 100 / total_categories))
    echo ""
    echo "Success Rate: ${success_rate}%"
    
    if [ $success_rate -ge 90 ]; then
        echo -e "${GREEN}🎉 Excellent test coverage!${NC}"
    elif [ $success_rate -ge 75 ]; then
        echo -e "${YELLOW}⚠️  Good test coverage, some issues to address${NC}"
    else
        echo -e "${RED}🚨 Test coverage needs improvement${NC}"
    fi
fi

# Exit with error if any tests failed
if [ ${#FAILED_CATEGORIES[@]} -gt 0 ]; then
    echo ""
    echo -e "${RED}Some tests failed. Please review and fix issues before deployment.${NC}"
    exit 1
else
    echo ""
    echo -e "${GREEN}All tests passed! 🚀 Ready for deployment.${NC}"
    exit 0
fi