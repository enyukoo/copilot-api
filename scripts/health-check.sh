#!/bin/bash
# Comprehensive health check script for Copilot API

set -e

# Configuration
API_URL="${API_URL:-http://localhost:3000}"
TIMEOUT="${TIMEOUT:-10}"
EXPECTED_STATUS="${EXPECTED_STATUS:-200}"
VERBOSE="${VERBOSE:-false}"
EXIT_ON_WARNING="${EXIT_ON_WARNING:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_verbose() {
    if [ "$VERBOSE" = "true" ]; then
        echo -e "${BLUE}[DEBUG]${NC} $1"
    fi
}

# Health check functions
check_basic_health() {
    log_info "Checking basic health at $API_URL/health"
    
    local response_file="/tmp/health_response_$$.json"
    local http_code
    
    http_code=$(curl -s -w "%{http_code}" -m $TIMEOUT "$API_URL/health" -o "$response_file" 2>/dev/null || echo "000")
    
    if [ "$http_code" != "$EXPECTED_STATUS" ]; then
        log_error "Health check failed with HTTP $http_code"
        if [ -f "$response_file" ]; then
            log_verbose "Response: $(cat "$response_file")"
        fi
        rm -f "$response_file"
        return 1
    fi
    
    # Parse health status
    if command -v jq >/dev/null 2>&1; then
        local health_status
        health_status=$(jq -r '.status // "unknown"' "$response_file" 2>/dev/null || echo "unknown")
        
        if [ "$health_status" != "healthy" ]; then
            log_error "Service status is '$health_status', expected 'healthy'"
            rm -f "$response_file"
            return 1
        fi
        
        log_verbose "Health status: $health_status"
    fi
    
    log_success "Basic health check passed"
    rm -f "$response_file"
    return 0
}

check_detailed_health() {
    log_info "Checking detailed health at $API_URL/health/detailed"
    
    local response_file="/tmp/detailed_health_$$.json"
    local http_code
    local warnings=0
    
    http_code=$(curl -s -w "%{http_code}" -m $TIMEOUT "$API_URL/health/detailed" -o "$response_file" 2>/dev/null || echo "000")
    
    if [ "$http_code" != "$EXPECTED_STATUS" ]; then
        log_warning "Detailed health check returned HTTP $http_code"
        if [ -f "$response_file" ]; then
            log_verbose "Response: $(cat "$response_file")"
        fi
        rm -f "$response_file"
        return 1
    fi
    
    if command -v jq >/dev/null 2>&1; then
        # Check memory usage
        local memory_used memory_total memory_percentage
        memory_used=$(jq -r '.services.memory.usage.heapUsed // 0' "$response_file" 2>/dev/null || echo "0")
        memory_total=$(jq -r '.services.memory.usage.heapTotal // 1' "$response_file" 2>/dev/null || echo "1")
        
        if [ "$memory_used" != "0" ] && [ "$memory_total" != "0" ]; then
            memory_percentage=$(echo "scale=2; $memory_used * 100 / $memory_total" | bc -l 2>/dev/null || echo "0")
            memory_mb=$(echo "scale=2; $memory_used / 1024 / 1024" | bc -l 2>/dev/null || echo "0")
            
            log_verbose "Memory usage: ${memory_mb}MB (${memory_percentage}%)"
            
            # Check if memory usage is too high
            if (( $(echo "$memory_percentage > 80" | bc -l 2>/dev/null || echo "0") )); then
                log_warning "High memory usage: ${memory_percentage}%"
                warnings=$((warnings + 1))
            fi
        fi
        
        # Check uptime
        local uptime
        uptime=$(jq -r '.uptime // 0' "$response_file" 2>/dev/null || echo "0")
        if [ "$uptime" != "0" ]; then
            local uptime_hours
            uptime_hours=$(echo "scale=2; $uptime / 3600" | bc -l 2>/dev/null || echo "0")
            log_verbose "Uptime: ${uptime_hours} hours"
        fi
        
        # Check service statuses
        local server_status memory_status
        server_status=$(jq -r '.services.server.status // "unknown"' "$response_file" 2>/dev/null || echo "unknown")
        memory_status=$(jq -r '.services.memory.status // "unknown"' "$response_file" 2>/dev/null || echo "unknown")
        
        if [ "$server_status" != "up" ]; then
            log_warning "Server status: $server_status"
            warnings=$((warnings + 1))
        fi
        
        if [ "$memory_status" != "ok" ]; then
            log_warning "Memory status: $memory_status"
            warnings=$((warnings + 1))
        fi
        
        log_verbose "Server status: $server_status, Memory status: $memory_status"
    fi
    
    if [ $warnings -gt 0 ]; then
        log_warning "Detailed health check completed with $warnings warnings"
        rm -f "$response_file"
        return 2  # Return 2 for warnings
    fi
    
    log_success "Detailed health check passed"
    rm -f "$response_file"
    return 0
}

check_metrics_endpoint() {
    log_info "Checking metrics endpoint at $API_URL/metrics"
    
    local http_code
    http_code=$(curl -s -w "%{http_code}" -m $TIMEOUT "$API_URL/metrics" -o /dev/null 2>/dev/null || echo "000")
    
    if [ "$http_code" != "$EXPECTED_STATUS" ]; then
        log_warning "Metrics endpoint returned HTTP $http_code"
        return 1
    fi
    
    log_success "Metrics endpoint accessible"
    return 0
}

check_api_endpoints() {
    log_info "Checking core API endpoints"
    local warnings=0
    
    # Check models endpoint
    local models_code
    models_code=$(curl -s -w "%{http_code}" -m $TIMEOUT "$API_URL/v1/models" -o /dev/null 2>/dev/null || echo "000")
    
    if [ "$models_code" = "401" ]; then
        log_verbose "Models endpoint requires authentication (HTTP 401) - this is expected"
    elif [ "$models_code" != "200" ]; then
        log_warning "Models endpoint returned HTTP $models_code"
        warnings=$((warnings + 1))
    else
        log_verbose "Models endpoint accessible"
    fi
    
    # Check usage endpoint
    local usage_code
    usage_code=$(curl -s -w "%{http_code}" -m $TIMEOUT "$API_URL/usage" -o /dev/null 2>/dev/null || echo "000")
    
    if [ "$usage_code" = "401" ]; then
        log_verbose "Usage endpoint requires authentication (HTTP 401) - this is expected"
    elif [ "$usage_code" != "200" ]; then
        log_warning "Usage endpoint returned HTTP $usage_code"
        warnings=$((warnings + 1))
    else
        log_verbose "Usage endpoint accessible"
    fi
    
    if [ $warnings -gt 0 ]; then
        log_warning "API endpoint check completed with $warnings warnings"
        return 2
    fi
    
    log_success "Core API endpoints accessible"
    return 0
}

# Main execution
main() {
    echo "🏥 Copilot API Health Check"
    echo "=========================="
    echo "URL: $API_URL"
    echo "Timeout: ${TIMEOUT}s"
    echo "Expected Status: $EXPECTED_STATUS"
    echo ""
    
    local exit_code=0
    local warnings=0
    local errors=0
    
    # Run health checks
    if ! check_basic_health; then
        errors=$((errors + 1))
        exit_code=1
    fi
    
    echo ""
    
    if ! check_detailed_health; then
        local detailed_result=$?
        if [ $detailed_result -eq 2 ]; then
            warnings=$((warnings + 1))
        else
            errors=$((errors + 1))
            exit_code=1
        fi
    fi
    
    echo ""
    
    if ! check_metrics_endpoint; then
        warnings=$((warnings + 1))
    fi
    
    echo ""
    
    if ! check_api_endpoints; then
        local api_result=$?
        if [ $api_result -eq 2 ]; then
            warnings=$((warnings + 1))
        else
            errors=$((errors + 1))
            exit_code=1
        fi
    fi
    
    # Summary
    echo ""
    echo "📊 HEALTH CHECK SUMMARY"
    echo "======================="
    
    if [ $errors -eq 0 ] && [ $warnings -eq 0 ]; then
        log_success "All health checks passed! 🎉"
        exit_code=0
    elif [ $errors -eq 0 ]; then
        log_warning "Health checks passed with $warnings warnings ⚠️"
        if [ "$EXIT_ON_WARNING" = "true" ]; then
            exit_code=1
        fi
    else
        log_error "Health checks failed: $errors errors, $warnings warnings ❌"
        exit_code=1
    fi
    
    echo "Errors: $errors"
    echo "Warnings: $warnings"
    
    exit $exit_code
}

# Check dependencies
if ! command -v curl >/dev/null 2>&1; then
    log_error "curl is required but not installed"
    exit 1
fi

if ! command -v bc >/dev/null 2>&1; then
    log_warning "bc is not installed - memory calculations will be limited"
fi

if ! command -v jq >/dev/null 2>&1; then
    log_warning "jq is not installed - JSON parsing will be limited"
fi

# Run main function
main "$@"