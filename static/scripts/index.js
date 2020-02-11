const labeledFaceDescriptors = async () => {
  const imgUrl = '/photo.png';
  const img = await faceapi.fetchImage(imgUrl);
  const personName = 'It\'s you';

  const fullFaceDescription = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();

  if (!fullFaceDescription) {
    throw new Error(`no faces detected for ${personName}`);
  }

  const faceDescriptors = [fullFaceDescription.descriptor];
  return new faceapi.LabeledFaceDescriptors(personName, faceDescriptors);
};

async function renderDetection(video, canvas, context, frameRate,
  maxDescriptorDistance, faceDescriptors) {
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  if (faceDescriptors) {
    const fullFaceDescriptions = await faceapi.detectAllFaces(canvas)
      .withFaceLandmarks().withFaceDescriptors();
    const faceMatcher = new faceapi.FaceMatcher(faceDescriptors, maxDescriptorDistance);
    const results = fullFaceDescriptions.map((fd) => faceMatcher.findBestMatch(fd.descriptor));

    results.forEach((bestMatch, i) => {
      const { box } = fullFaceDescriptions[i].detection;
      const text = bestMatch.toString();
      const drawBox = new faceapi.draw.DrawBox(box, { label: text });
      drawBox.draw(canvas);
    });
  }

  setTimeout(renderDetection, 1 / frameRate, video, canvas, context, frameRate,
    maxDescriptorDistance, faceDescriptors);
}

window.onload = async () => {
  const video = document.querySelector('video');
  const canvas = document.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const messageEl = document.querySelector('p');
  const maxDescriptorDistance = 0.6;
  let faceDescriptors;

  await faceapi.loadSsdMobilenetv1Model();
  await faceapi.loadFaceLandmarkModel();
  await faceapi.loadFaceRecognitionModel();

  try {
    faceDescriptors = await labeledFaceDescriptors();
  } catch (e) {
    messageEl.setAttribute('data-status', 'error');
    messageEl.innerHTML = e.message.concat(`<br /><br /> If this
      is an error about not finding the photo.png file, save the
      image from canvas (with the correct name) inside the users_photos
      folder and then reload your page`);
  }

  canvas.width = 800;
  canvas.height = 600;

  renderDetection(video, canvas, ctx, 1, maxDescriptorDistance, faceDescriptors);

  if (messageEl.getAttribute('data-status') === 'loading') {
    messageEl.textContent = '';
  }

  if (navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(async (stream) => {
        video.srcObject = stream;
      })
      .catch((error) => {
        throw error;
      });
  }
};
