# Shoshin-Causeway Integration: Next Steps

## Completed (2026-01-28)
- [x] ActionType union type extended with all Matlantis types
- [x] MatlantisExecutor component for execution from Action Space
- [x] MatlantisChat panel for natural language interaction
- [x] Categorized action type dropdown (General, Matlantis, Matlantis Batch)
- [x] Color-coded action nodes in visualization
- [x] React Flow container sizing fix

## Next Steps

### High Priority
1. **Ollama Integration Testing**
   - Verify Ollama server connectivity for MatlantisChat
   - Test natural language command generation
   - Add error handling for Ollama unavailability

2. **Backend Server Improvements**
   - Add health check endpoint
   - Improve WebSocket reconnection logic
   - Add execution queue for multiple simultaneous jobs

3. **Structure File Management**
   - Cache uploaded structure files
   - Support for structure file preview
   - History of recent structures

### Medium Priority
4. **Result Integration**
   - Store execution results in Causeway state
   - Link results back to hypotheses
   - Visualization of MD trajectories and analysis results

5. **Batch Workflow Enhancement**
   - UI for managing structure lists
   - Progress tracking for batch jobs
   - Aggregated result views

6. **Parameter Templates**
   - Save common parameter combinations
   - Quick-apply templates to actions
   - User-defined parameter presets

### Low Priority
7. **UX Improvements**
   - Keyboard shortcuts for common actions
   - Drag-and-drop structure files
   - Command history in MatlantisChat

8. **Documentation**
   - User guide for Matlantis actions
   - API documentation for backend
   - Example workflows

## Known Issues
- WebSocket connection warning when backend not running (expected behavior)
- React Flow warning on initial render (mitigated with min-height)

## Dependencies
- Backend server (port 8081) required for execution
- Ollama required for natural language chat
- Matlantis API credentials for actual calculations
