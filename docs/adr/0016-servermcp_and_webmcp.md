# ADR-0016: Dual MCP Architecture (Server MCP & WebMCP)

## Status
**Future** — Depends on W3C WebMCP standard (`navigator.modelContext`, Chrome 146+). Not implementable today. References Zustand and TypeScript imports that do not exist in this project.

## Context
Our CAD system currently relies on a Server-Side Model Context Protocol (MCP) server. The client-side application heavily utilizes a local-first architecture, running Hono, Zod, and OpenAPI natively in the browser to handle logic and state, which syncs back to the Server MCP via WebSocket events.
With the introduction of the W3C WebMCP standard (navigator.modelContext in Chrome 146+), we have the opportunity to expose our local Hono router directly to browser-native AI agents, eliminating network latency for purely UI-driven tasks.
We need a unified architecture that supports both Server MCP and WebMCP simultaneously, routing requests through our existing client-side Hono application. Additionally, both MCP systems must be individually toggleable via the GUI Control Plane (alongside existing toggles like automerge and online/offline).
2. Decision
We will implement a Dual MCP capability model utilizing our existing client-side Hono router as the single source of truth for tool execution.
 * Dynamic WebMCP Adapter: We will build a service that reads the generated OpenAPI JSON from our local @hono/zod-openapi instance and dynamically translates those endpoints into navigator.modelContext.registerTool definitions.
 * Universal Execution: When a browser agent invokes a WebMCP tool, the adapter will construct a standard Web Request and pass it to localHonoApp.fetch(request), returning the Response to the agent.
 * Control Plane State: We will introduce two new global state toggles to the GUI: isWebMcpEnabled and isServerMcpEnabled.
 * Gated Execution: * WebMCP tool registration and handling will only initialize and execute if isWebMcpEnabled is true.
   * WebSocket event emitting for UI state sync will only fire if isServerMcpEnabled is true.
3. Implementation Guidelines for CLI
Step 1: Update the Control Plane Store
Add the new toggles to the existing global state manager (e.g., Zustand, Redux, or Context). Ensure these are bound to GUI toggle switches in the settings panel.
interface ControlPlaneState {
  isOffline: boolean;
  isAutomergeEnabled: boolean;
  isWebMcpEnabled: boolean;    // NEW
  isServerMcpEnabled: boolean; // NEW
}

Step 2: Create the WebMCP-to-Hono Adapter
Create a new service (services/webMcpAdapter.ts) that initializes when isWebMcpEnabled is toggled on.
 * Requirement 1: Verify browser support: if (!('modelContext' in navigator)) return;
 * Requirement 2: Fetch the OpenAPI spec from the local Hono instance (e.g., const spec = app.getOpenAPISpec()).
 * Requirement 3: Iterate over spec.paths. For each endpoint, call navigator.modelContext.registerTool().
 * Requirement 4 (The Handler): Inside the registered tool's handler, construct a Request object using the incoming arguments and feed it to Hono.
<!-- end list -->
// Pseudo-code for CLI instruction
const handler = async (args) => {
  if (!getState().isWebMcpEnabled) return { error: "WebMCP is disabled by user" };
  
  const request = new Request(`http://localhost${path}`, {
    method: 'POST', // or derived from spec
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args)
  });
  
  const response = await localHonoApp.fetch(request);
  return await response.json();
};

Step 3: Gate the Server MCP Sync
Locate the existing WebSocket event emitters that broadcast UI state changes to the backend. Wrap these emissions in a check for the isServerMcpEnabled toggle.
// Pseudo-code for CLI instruction
function broadcastStateChange(payload) {
  if (!getState().isServerMcpEnabled) return;
  webSocket.send(JSON.stringify(payload));
}

4. Testing Strategy
The CLI must write tests to guarantee the isolation and interoperability of the toggles.
 * Unit Tests (Adapter): * Mock navigator.modelContext.registerTool.
   * Pass a mock Hono OpenAPI spec to the adapter and assert that registerTool is called the correct number of times with correctly mapped JSON Schemas.
 * Integration Tests (Execution):
   * Simulate a WebMCP tool invocation via the mock and assert that localHonoApp.fetch receives the correct Request object and returns the expected Hono response.
 * E2E/State Tests (The Toggles):
   * Test that turning isWebMcpEnabled to false either unregisters the tools or causes the handlers to immediately return an explicit rejection/error.
   * Test that turning isServerMcpEnabled to false successfully prevents WebSocket messages from firing during canvas interactions.
   * Assert that both can be active simultaneously without state conflicts (Hono should process both local agent requests and human-driven interactions synchronously).
5. Consequences
 * Positive: Zero duplicated business logic. Hono remains the single interface for human GUI clicks, WebMCP agents, and Server MCP commands.
 * Positive: Granular user control over privacy and performance via the GUI toggles.
 * Negative: WebMCP is experimental (Chrome 146+). The adapter must fail gracefully on older browsers or non-Chromium engines.

## quick test suggestions

Here are the Vitest test file structures designed specifically for your Gemini CLI to execute.

These tests map directly to the requirements in the ADR, mocking the experimental navigator.modelContext API and ensuring your local Hono router correctly processes the requests based on your GUI toggles.
You can feed these two test files to your CLI to drive the Test-Driven Development (TDD) of the adapter.

1. The WebMCP Adapter Test Suite
Save this as tests/webMcpAdapter.test.ts. This file ensures that your OpenAPI spec is correctly translated into WebMCP tools and that the browser agent's requests are properly formatted into standard Web Request objects for Hono.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// TODO: CLI should import the actual local Hono app and the new adapter
// import { localHonoApp } from '../src/api/app';
// import { initWebMcpAdapter } from '../src/services/webMcpAdapter';
// import { useControlStore } from '../src/store/controlPlane';

describe('WebMCP to Hono Adapter', () => {
  let mockRegisterTool: any;

  beforeEach(() => {
    // 1. Mock the experimental WebMCP API
    mockRegisterTool = vi.fn();
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        modelContext: {
          registerTool: mockRegisterTool,
        },
      },
      writable: true,
    });
    
    // 2. Mock state to enable WebMCP for base tests
    // vi.mocked(useControlStore).mockReturnValue({ isWebMcpEnabled: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should abort initialization silently if navigator.modelContext is undefined', async () => {
    // Simulate an older browser (e.g., Chrome 145 or Firefox)
    delete (globalThis.navigator as any).modelContext;
    
    // TODO: CLI to call initWebMcpAdapter()
    // expect(adapter).not.toThrow();
  });

  it('should parse the Hono OpenAPI spec and call registerTool for each endpoint', async () => {
    // TODO: CLI to mock Hono app.getOpenAPISpec() returning at least 2 endpoints (e.g., select_object, change_color)
    // TODO: CLI to call initWebMcpAdapter()
    
    // Assertions
    expect(mockRegisterTool).toHaveBeenCalledTimes(2);
    
    // Verify the JSON schema mapping
    const firstCallArgs = mockRegisterTool.mock.calls[0][0];
    expect(firstCallArgs).toHaveProperty('name', 'select_object');
    expect(firstCallArgs.inputSchema).toBeDefined();
    expect(typeof firstCallArgs.handler).toBe('function');
  });

  it('should route a WebMCP tool invocation directly to the local Hono app via standard Request', async () => {
    // TODO: CLI to initialize adapter and capture the registered handler function
    // const registeredHandler = mockRegisterTool.mock.calls[0][0].handler;
    
    // TODO: Spy on Hono app.fetch
    // const fetchSpy = vi.spyOn(localHonoApp, 'fetch');

    // Simulate the browser AI agent executing the tool
    const mockAgentInput = { objectId: 'box-123' };
    // const response = await registeredHandler(mockAgentInput);

    // Assertions
    // expect(fetchSpy).toHaveBeenCalled();
    // const requestArg = fetchSpy.mock.calls[0][0] as Request;
    // expect(requestArg.method).toBe('POST'); // or whatever the OpenAPI spec defined
    // expect(response).toHaveProperty('success', true);
  });
});

2. The Control Plane Toggles Test Suite
Save this as tests/controlPlaneToggles.test.ts. This file verifies that your GUI state management correctly gates the execution of both the local WebMCP handlers and the outbound WebSocket syncs.
import { describe, it, expect, vi, beforeEach } from 'vitest';
// TODO: CLI should import the state store, WebMCP handler, and WebSocket sync function
// import { useControlStore } from '../src/store/controlPlane';
// import { broadcastStateChange } from '../src/sync/serverMcpSync';

describe('Dual MCP Control Plane Toggles', () => {
  
  describe('WebMCP Toggle (isWebMcpEnabled)', () => {
    it('should return an explicit error to the browser agent if invoked while disabled', async () => {
      // TODO: CLI to mock store state: isWebMcpEnabled = false
      
      // TODO: Extract the handler from the adapter and invoke it
      // const response = await handler({ objectId: 'box-123' });
      
      // Assertion: Do not throw an unhandled error, return a safe rejection object
      // expect(response.error).toBeDefined();
      // expect(response.error).toMatch(/WebMCP is disabled/i);
    });
  });

  describe('Server MCP Toggle (isServerMcpEnabled)', () => {
    let mockWebSocketSend: any;

    beforeEach(() => {
      mockWebSocketSend = vi.fn();
      // TODO: CLI to mock the global WebSocket instance or inject the mock
    });

    it('should emit UI state payload to WebSocket when isServerMcpEnabled is true', () => {
      // TODO: CLI to mock store state: isServerMcpEnabled = true
      // broadcastStateChange({ selectedObject: 'sphere-456' });
      
      expect(mockWebSocketSend).toHaveBeenCalledOnce();
      const payload = JSON.parse(mockWebSocketSend.mock.calls[0][0]);
      expect(payload.selectedObject).toBe('sphere-456');
    });

    it('should silently drop UI state payloads when isServerMcpEnabled is false', () => {
      // TODO: CLI to mock store state: isServerMcpEnabled = false
      // broadcastStateChange({ selectedObject: 'sphere-456' });
      
      expect(mockWebSocketSend).not.toHaveBeenCalled();
    });
  });
});

How to use this with your CLI
Because you are using an AI-assisted workflow, you can pass the ADR and these test files directly to your CLI with a prompt like:
> "Read docs/adr/001-dual-mcp-architecture.md. Use the test structures in tests/webMcpAdapter.test.ts and tests/controlPlaneToggles.test.ts to implement the webMcpAdapter service and update our Zustand store. Make the tests pass."

## actual implementation code for the initWebMcpAdapter function that maps the OpenAPI spec schemas to the registerTool format

Here is the implementation code for the webMcpAdapter.
This script acts as the bridge. It fetches the OpenAPI JSON generated by your @hono/zod-openapi setup, parses the paths, and dynamically translates them into WebMCP tools.
You can save this as src/services/webMcpAdapter.ts and hand it to your CLI.
The Implementation (src/services/webMcpAdapter.ts)
import { useControlStore } from '../store/controlPlane'; // Adjust path to your store

/**
 * Initializes the WebMCP Adapter by parsing the local Hono OpenAPI spec
 * and registering tools with the browser's native AI agent.
 * * @param localHonoApp The instance of your client-side Hono application
 * @param openApiDocPath The internal route serving your OpenAPI JSON (e.g., '/openapi.json')
 */
export const initWebMcpAdapter = async (localHonoApp: any, openApiDocPath: string = '/openapi.json') => {
  // 1. Feature Detection: Exit cleanly if the browser doesn't support WebMCP yet
  if (!('modelContext' in navigator)) {
    console.warn('WebMCP (navigator.modelContext) is not supported in this browser.');
    return;
  }

  try {
    // 2. Fetch the OpenAPI spec locally from Hono
    // We construct a dummy Request because Hono's .fetch() expects standard Web API requests
    const specRequest = new Request(`http://localhost${openApiDocPath}`);
    const specResponse = await localHonoApp.fetch(specRequest);
    const openApiSpec = await specResponse.json();

    // 3. Iterate through all the paths exposed in your API
    for (const [path, methods] of Object.entries(openApiSpec.paths)) {
      for (const [method, operation] of Object.entries(methods as Record<string, any>)) {
        
        // We only register operations that have an operationId (your Zod-OpenAPI routes)
        if (!operation.operationId) continue;

        // Extract the JSON Schema from the OpenAPI requestBody (assuming JSON payloads for mutations)
        // Note: For a production app, you might also want to parse `operation.parameters` for GET requests
        const inputSchema = operation.requestBody?.content?.['application/json']?.schema || {
          type: "object",
          properties: {}
        };

        // 4. Register the tool with the browser
        (navigator as any).modelContext.registerTool({
          name: operation.operationId, // e.g., 'selectObject'
          description: operation.summary || operation.description || `Execute ${operation.operationId}`,
          inputSchema: inputSchema,
          
          // 5. The Handler: This runs when the browser agent invokes the tool
          handler: async (args: Record<string, any>) => {
            
            // GATE CHECK: Obey the GUI Control Plane Toggle
            const { isWebMcpEnabled } = useControlStore.getState();
            if (!isWebMcpEnabled) {
              return { 
                success: false, 
                error: "WebMCP is currently disabled by the user in the CAD GUI settings." 
              };
            }

            try {
              // Construct a standard Request object to feed to Hono
              const url = new URL(path, 'http://localhost');
              const isGetOrHead = ['get', 'head'].includes(method.toLowerCase());
              
              // If it's a GET request, map args to URL search parameters
              if (isGetOrHead) {
                Object.entries(args).forEach(([key, value]) => url.searchParams.append(key, String(value)));
              }

              const request = new Request(url.toString(), {
                method: method.toUpperCase(),
                headers: { 'Content-Type': 'application/json' },
                body: isGetOrHead ? undefined : JSON.stringify(args)
              });

              // Pass the request to your local Hono engine
              const response = await localHonoApp.fetch(request);
              
              // Parse and return the response to the agent
              const result = await response.json();
              return { 
                success: response.ok, 
                status: response.status,
                data: result 
              };

            } catch (error: any) {
              return { success: false, error: error.message || 'Internal Adapter Error' };
            }
          }
        });
        
        console.log(`Registered WebMCP Tool: ${operation.operationId}`);
      }
    }
  } catch (error) {
    console.error('Failed to initialize WebMCP adapter:', error);
  }
};

Why this specific implementation works so well:
 * Zero Maintenance: Because it dynamically loops over openApiSpec.paths, every time you add a new route to your Hono backend using @hono/zod-openapi, it automatically becomes a WebMCP tool without you having to write a single line of extra adapter code.
 * Local Validation: By feeding the request back through localHonoApp.fetch(request), you are guaranteeing that the AI agent is subjected to the exact same Zod validation rules as your normal GUI web application. If the agent hallucinates a parameter, Zod catches it and returns a 400 error, which the adapter safely passes back to the agent so it can correct its mistake.
 * Toggle Compliance: The handler executes the GUI state check at the moment of invocation. This means the user can flick the switch on and off in the GUI, and the security rules apply instantly without needing a page refresh.




