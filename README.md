# @dimensional/napi-canon-cameras

EDSDK (Canon camera) wrapper module for Node.js

-   [Features](#features)
-   [Usage Example](#usage)
-   [Build Package](#build-package)
    -   [EDSDK Files](#edsdk-files)
    -   [Build Process](#build-process)
    -   [NPM Tasks](#npm-tasks)
-   [FAQ](#faq)
-   [API Documentation](API.md)

## Features

The EDSDK provides a lot of features and not all of them are
implemented in the module. Our use case was a photo booth
application.

-   [x] List Cameras
-   [x] Camera Events
-   [ ] Read Camera Properties
    -   [x] Text
    -   [x] Integer
        -   [x] Flags (true/false)
        -   [x] Options (named list values)
        -   [x] Aperture
        -   [x] Shutter Speed
        -   [x] Exposure Compensation
    -   [x] Integer Array
    -   [x] Time
-   [ ] Write Camera Properties
    -   [ ] Text Properties
    -   [x] Integer
    -   [ ] Integer Array
    -   [ ] Time
-   [x] Take Picture
    -   [x] Download To Directory
    -   [x] Download To File
    -   [x] Download To String (Base64)
-   [ ] Live View
    -   [x] Download Image To Data URL
    -   [x] Properties
    -   [x] Histogram
    -   [ ] Rolling & Pitching
    -   [ ] PowerZoom
-   [ ] Storage
    -   [x] List Volumes
    -   [x] List Directories and Files
    -   [x] Download Thumbnail
    -   [x] Download Files

## Usage

```typescript
import {
    Camera,
    CameraProperty,
    FileChangeEvent,
    ImageQuality,
    Option,
    watchCameras,
} from "../";

process.on("SIGINT", () => process.exit());

// catch download request events
cameraBrowser.setEventHandler((eventName, event) => {
    if (eventName === CameraBrowser.Events.DownloadRequest) {
        const file = (event as DownloadRequestEvent).file;
        console.log(file);
        const localFile = file.downloadToPath(__dirname + "/images");
        console.log(`Downloaded ${file.name}.`);

        process.exit();
    }
});

// get first camera
const camera = cameraBrowser.getCamera();
if (camera) {
    console.log(camera);
    camera.connect();
    // configure
    camera.setProperties({
        [CameraProperty.ID.SaveTo]: Option.SaveTo.Host,
        [CameraProperty.ID.ImageQuality]: ImageQuality.ID.LargeJPEGFine,
        [CameraProperty.ID.WhiteBalance]: Option.WhiteBalance.Fluorescent,
    });
    // trigger picture
    camera.takePicture();
} else {
    console.log("No camera found.");
}

// watch for camera events
watchCameras();
```

## Build Package

### EDSDK Files

The package does not include the Canon EDSDK files. Before installing, you need
to copy the files to specific directories inside the `third_party` directory.
You will also need to apply a bugfix in the provided header files.
**See the [third_party README](third_party/README.md) for instructions on how to do this.**

### Build Process

To install the package you will have to build a TGZ.

-   Run `npm run package` and wait for a successful build
-   Make sure `../node_packages/@dimensional/napi-canon-cameras.tgz` has been created
-   `cd ../YourProject` (Switch to your project directory)
-   Add `"@dimensional/napi-canon-cameras": "file:../node_packages/@dimensional/napi-canon-cameras.tgz"` to your package.json dependencies and `npm i`
    (or just directly `npm i file:../node_packages/@dimensional/napi-canon-cameras.tgz`)

### NPM Tasks

-   `package` - Create TGZ package for AddOn
-   `prebuild` - Build for 32 and 64bit Node.js
-   `prebuild:x64` - Build for 64bit Node.js
-   `prebuild:ia32` - Build for 32bit Node.js
-   `build:docs` - Update API documentation in README.md
-   `build:stubs` - Update and build stubs (needs prebuild AddOn)
-   `clean` - Remove build artifacts

## FAQ

### Does the module work in Electron Applications?

Yes.
