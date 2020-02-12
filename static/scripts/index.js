const CANVAS_HEIGHT = 600;
const CANVAS_WIDTH = 800;
const MAX_DESCRIPTOR_DISTANCE = 0.6;
const STATUS_ERROR = 'error';
const STATUS_LOADING = 'loading';
const STATUS_RECOGNIZING = 'recognizing';
const STATUS_NOT_RECOGNIZED = 'notRecognized';
const STATUS_RECOGNIZED = 'recognized';
const STATUS_USER_CREATED = 'userCreated';
const STATUS_USER_NOT_CREATED = 'userNotCreated';

const video = document.createElement('video');
video.autoplay = true;

let videoToCanvasRenderer;

/**
 * Changes the current page of the app
 *
 * @author mauricio.araldi
 * @since 0.2.0
 * 
 * @param {String} page The page to navigate to
 */
function changePage(page) {
  const pages = document.querySelectorAll('main[data-page]');

  pages.forEach((element, index) => {
    if (element.dataset.page === page) {
      return element.classList.remove('hidden');
    }

    element.classList.add('hidden');
  });
}

/**
 * Set the status of the application
 *
 * @author mauricio.araldi
 * @since 0.2.0
 * 
 * @param {String} status Current status of the application
 * @param {String} text Status message to be displayed
 */
function setAppStatus(status, text) {
  const messageEl = document.querySelector('#status');

  messageEl.setAttribute('data-status', status);
  messageEl.innerHTML = text;
}

/**
 * Get the status of the application
 *
 * @author mauricio.araldi
 * @since 0.2.0
 */
function getAppStatus() {
  return document.querySelector('#status').dataset.status;
}

/**
 * Loads the face models into the app
 *
 * @author mauricio.araldi
 * @since 0.2.0
 */
async function loadFaceModels() {
  await faceapi.loadSsdMobilenetv1Model();
  await faceapi.loadFaceLandmarkModel();
  await faceapi.loadFaceRecognitionModel();
}

/**
 * Renders the canvas with the picture of the user
 *
 * @author mauricio.araldi
 * @since 0.2.0
 * 
 * @param {HTMLVideoElement} video The video element used to make
 * the canvas image
 * @param {Canvas2DContext} context The context of the canvas
 * to render images
 * @param {frameRate} frameRate The rate at which the canvas updates
 */
async function renderDetection(video, context, frameRate) {
  context.drawImage(video, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  setTimeout(renderDetection, 1 / frameRate, video, context, frameRate);
}

/**
 * Sends a face recognition request to the server
 *
 * @author mauricio.araldi
 * @since 0.2.0
 * 
 * @param {String} imageData The base64 data of the image
 * @return {String} Name of recognized user
 */
async function sendRecognitionRequest(imageData) {
  return new Promise((resolve, reject) => {
    const headers = new Headers();
    headers.append('Content-Type', 'application/json');

    fetch('/recognize', {
      headers,
      body: JSON.stringify({
        image: imageData
      }),
      method: 'POST'
    })
      .then(data => data.json())
      .then(response => {
        resolve(response.user);
      })
      .catch(error => reject(error));
  });
}

/**
 * Starts the recognition of faces
 *
 * @author mauricio.araldi
 * @since 0.2.0
 */
async function startCamera() {
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

/**
 * Tries to recognize the current camera image
 *
 * @author mauricio.araldi
 * @since 0.2.0
 * 
 * @return {String} Name of the recognized user
 */
async function recognizeFace() {
  setAppStatus(STATUS_RECOGNIZING, 'Checking face...');

  const tempCanvas = document.createElement('canvas');
  tempCanvas.height = CANVAS_HEIGHT;
  tempCanvas.width = CANVAS_WIDTH;

  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);

  sendRecognitionRequest(tempCanvas.toDataURL()).then(
    result => {
      if (!result) {
        return setAppStatus(STATUS_NOT_RECOGNIZED, 'User not recognized');
      }

      setAppStatus(STATUS_RECOGNIZED, `Hello ${result}`);
    },
    error => {
      throw error;
    }
  );
}

/* App initialization */
window.onload = async () => {
  const goToNewUserButton = document.querySelector('#go-to-create-user');
  const createNewUserForm = document.querySelector('#create-user-form');

  setAppStatus(STATUS_LOADING, 'Loading... It may take a while...');

  changePage('login');

  await startCamera();

  setTimeout(() => {
    recognizeFace();
  }, 1000);

  if (getAppStatus === STATUS_LOADING) {
    setAppStatus('');
  }

  /* Add events */
  goToNewUserButton.addEventListener('click', () => {
    changePage('new-user');

    const canvas = document.querySelector('#new-user-photo');
    const ctx = canvas.getContext('2d');

    canvas.height = CANVAS_HEIGHT;
    canvas.width = CANVAS_WIDTH;

    videoToCanvasRenderer = setInterval(() => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }, 100);
  });

  createNewUserForm.addEventListener('submit', (ev) => {
    ev.preventDefault();

    const canvas = document.querySelector('#new-user-photo');
    const userName = document.querySelector('#name').value;
    const userImage = canvas.toDataURL();

    const headers = new Headers();
    headers.append('Content-Type', 'application/json');

    fetch('/newuser', {
      headers,
      body: JSON.stringify({
        image: userImage,
        name: userName
      }),
      method: 'POST'
    })
      .then(data => data.json())
      .then(response => {
        if (!response.user) {
          return setAppStatus(STATUS_USER_NOT_CREATED, 'Error. User not created.');
        }

        setAppStatus(USER_CREATED, 'User created');

        changePage('login');

        setTimeout(() => {
          recognizeFace();
        }, 1000);
      })
      .catch(error => reject(error));
  });
};