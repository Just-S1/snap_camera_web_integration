import { Transform2D, bootstrapCameraKit, createImageSource, createMediaStreamSource } from "@snap/camera-kit";
import './globals.css'

window.addEventListener("load", async () => {
  const cameraKit = await bootstrapCameraKit({
    apiToken: "eyJhbGciOiJIUzI1NiIsImtpZCI6IkNhbnZhc1MyU0hNQUNQcm9kIiwidHlwIjoiSldUIn0.eyJhdWQiOiJjYW52YXMtY2FudmFzYXBpIiwiaXNzIjoiY2FudmFzLXMyc3Rva2VuIiwibmJmIjoxNzEyODA2MTUxLCJzdWIiOiIzZDUxMTFkOC04OWVjLTQ2MTctODM0NC01MjEwNTNjNzBlZDV-U1RBR0lOR344ZDg5Y2YxZC1lMGM3LTQ3OWYtYmFkYi04MmVlODI1MDZiZGUifQ.OxGABJ0gIeRjEVdVrKQt8071Q8yDpE53wxTrSzUbceI",
  });

  const liveRenderTarget = document.getElementById('canvas-output') as HTMLCanvasElement;

  const session = await cameraKit.createSession({ liveRenderTarget });

  const mediaStream = await navigator.mediaDevices.getUserMedia({
    video: true,
  });

  const source = await createMediaStreamSource(mediaStream)
  await session.setSource(source);
  source.setTransform(Transform2D.MirrorX)

  await session.play()

  const DEFAULT_LENS_GROUP_ID = '70095952-9d24-4b73-bb1a-19f3953e2cee'

  const { lenses } = await cameraKit.lensRepository.loadLensGroups([DEFAULT_LENS_GROUP_ID]);

  console.log(lenses)

  // Populate the lens-select dropdown with the lenses
  const lensSelect = document.getElementById('lens-select') as HTMLSelectElement;
  lenses.forEach(lens => {
    const option = document.createElement('option');
    option.value = lens.id; // Assuming lens has an id property
    option.text = lens.name; // Assuming lens has a name property
    lensSelect.add(option);
  });

  lensSelect.addEventListener('change', async (event) => {
    const selectedLensId = (event.target as HTMLSelectElement).value;

    const lens = await cameraKit.lensRepository.loadLens(selectedLensId, DEFAULT_LENS_GROUP_ID)

    await session.applyLens(lens)

  });

  // After populating the lens-select dropdown

  // Populate the source-select dropdown with the video input devices
  const sourceSelect = document.getElementById('source-select') as HTMLSelectElement;
  navigator.mediaDevices.enumerateDevices()
    .then(devices => {
      devices.forEach(device => {
        if (device.kind === 'videoinput') {
          const option = document.createElement('option');
          option.value = `Camera:${device.deviceId}`;
          option.text = device.label;
          sourceSelect.add(option);
        }
      });
    })
    .catch(err => {
      console.log(err.name + ": " + err.message);
    });

  const option = document.createElement('option');
  option.value = "Image:";
  option.text = "Image File";
  sourceSelect.add(option);

  // Handle source selection
  sourceSelect.addEventListener('change', async (event) => {
    const selectedSource = (event.target as HTMLSelectElement).value;

    const [type, url] = selectedSource.split(':'); // Split the selected value to get the type and URL

    if (type === 'Image') {
      // Trigger the file input to open the file selection dialog
      const imageInput = document.getElementById('image-input') as HTMLInputElement;
      imageInput.click();

      imageInput.addEventListener('change', async (event) => {

        const { files } = (event.target as HTMLInputElement);

        if (files && files.length > 0) {
          const file = files[0]
          const imageUrl = URL.createObjectURL(file)

          const imageElement = document.createElement("img");
          imageElement.src = imageUrl;
          imageElement.crossOrigin = "anonymous";

          imageElement.addEventListener(
            "load",
            async () => {
              const imgSrc = await createImageSource(imageElement);
              await session.setSource(imgSrc.copy());
            },
            { once: true }
          );
        }
      })
    }

    if (type === 'Camera') {
      console.log(url)
      const constraints = {
        video: { deviceId: { exact: url } }
      };
      const newMediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      const source = await createMediaStreamSource(newMediaStream)
      await session.setSource(source);
      source.setTransform(Transform2D.MirrorX)
    };
  })

})