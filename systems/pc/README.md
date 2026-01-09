# pc

Process Compose orchestration.

## Tasks

```sh
task pc:up            # Start all services with TUI
task pc:up:bg         # Start in background
task pc:up:headless   # Start without TUI (CI)
task pc:down          # Stop all services
task pc:attach        # Attach to running TUI
task pc:deps:install  # Install binary
task pc:deps:clean    # Remove binary
task pc:debug:self    # Print debug info
```

## Config

Services defined in `process-compose.yml`. Environment loaded from `.env`.
