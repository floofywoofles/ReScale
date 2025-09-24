/**
 * Build script
 *
 * Steps:
 * 1) Ensure `./build` exists
 * 2) Compile with Bun to a single binary at `./build/rescale`
 * 3) Mark the binary executable
 * 4) Strip symbols on macOS
 * 5) Compress with UPX (platform-specific flags)
 */
import { exec } from "child_process";

exec("mkdir -p ./build", error => {
    if (error) {
        console.error(error);
        process.exit(1);
    }
});

exec("bun build ./index.ts --compile --outfile ./build/rescale", error => {
    if (error) {
        console.error(error);
        process.exit(1);
    }
});
exec("chmod +x ./build/rescale", error => {
    if (error) {
        console.error(error);
        process.exit(1);
    }
});

if (process.platform === "darwin" || process.platform === "linux") {
    exec("strip ./build/rescale", error => {
        if (error) {
            console.error(error);
            process.exit(1);
        }
    });
}

// Check if platform is macOS
if (process.platform === "darwin" && process.platform === "linux") {
    exec("upx --best --lzma --force-macos ./build/rescale", error => {
        if (error) {
            console.error(error);
            process.exit(1);
        }
    });
} else {
    exec("upx --best --lzma ./build/rescale", error => {
        if (error) {
            console.error(error);
            process.exit(1);
        }
    });
}
