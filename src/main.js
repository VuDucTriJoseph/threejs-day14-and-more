import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as CANNON from "cannon-es";
import GUI from "lil-gui";
import { GLTFLoader } from "three/examples/jsm/Addons.js";

const canvas = document.querySelector("#app");
const gui = new GUI();
let stageModel = null;
//////////////////////////////////
const loadingManager = new THREE.LoadingManager();
loadingManager.onStart = (url, itemsLoaded, itemsTotal) => {
  console.log(`Loading started: ${url} (${itemsLoaded} of ${itemsTotal})`);
};
loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
  console.log(`Loading progress: ${url} (${itemsLoaded} of ${itemsTotal})`);
};
loadingManager.onLoad = () => {
  console.log("Loading complete.");
};
loadingManager.onError = (url) => {
  console.error(`Loading error: ${url}`);
};

//////////////////////////////
const scene = new THREE.Scene();

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

////////////////////////////////
const camera = new THREE.PerspectiveCamera(
  75,
  sizes.width / sizes.height,
  0.1,
  100,
);
camera.position.set(2, 3, 4);
scene.add(camera);
/////////////////////////////////
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
//////////////////////////////////

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
/////////////////////////////////

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 5, 5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 20;
directionalLight.shadow.camera.left = -5;
directionalLight.shadow.camera.right = 5;
directionalLight.shadow.camera.top = 5;
directionalLight.shadow.camera.bottom = -5;
scene.add(directionalLight);

const directionalLightHelper = new THREE.DirectionalLightHelper(
  directionalLight,
  1,
  0xff0000,
);
scene.add(directionalLightHelper);

const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x888888);
scene.add(gridHelper);

const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);
/////////////////////////////////////////

const textureLoader = new THREE.TextureLoader(loadingManager);
const colorTexture = textureLoader.load(
  "https://threejs.org/examples/textures/uv_grid_opengl.jpg",
  () => console.log("Texture loaded"),
  undefined,
  () => console.warn("Texture failed to load, using fallback color"),
);

const geometry = new THREE.SphereGeometry(0.2, 32, 32);
const material = new THREE.MeshStandardMaterial({
  color: 0x2c7efc,
  map: colorTexture,
});
const sphere = new THREE.Mesh(geometry, material);
sphere.castShadow = true;
scene.add(sphere);

const planeGeometry = new THREE.PlaneGeometry(20, 20);
const planeMaterial = new THREE.ShadowMaterial({ opacity: 0.4 });
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -Math.PI / 2;
plane.position.y = -0.5;
plane.receiveShadow = true;
scene.add(plane);

//// stage texture ///
const stageMorningTexture = textureLoader.load("/morning.png");
stageMorningTexture.colorSpace = THREE.SRGBColorSpace;
stageMorningTexture.flipY = false;

const stageAfternoonTexture = textureLoader.load("/afternoon.png");
stageAfternoonTexture.colorSpace = THREE.SRGBColorSpace;
stageAfternoonTexture.flipY = false;

const gltfLoader = new GLTFLoader(loadingManager);

gltfLoader.load("/remake_stage.glb", (gltf) => {
  stageModel = gltf.scene;

  const morningStageMat = new THREE.MeshBasicMaterial({
    map: stageMorningTexture,
  });

  stageModel.traverse((child) => {
    if (child.isMesh) {
      child.material = morningStageMat;
      child.receiveShadow = false;
      child.castShadow = false;
    }
  });

  scene.add(stageModel);
});

const slopeGeo = new THREE.PlaneGeometry(10, 10);
const slopeMat = new THREE.MeshStandardMaterial({
  color: 0x44aa44,
  side: THREE.DoubleSide, // Hiển thị cả 2 mặt để dễ nhìn
});
const slopeMesh = new THREE.Mesh(slopeGeo, slopeMat);
slopeMesh.receiveShadow = true;

// Nghiêng mặt phẳng đi một góc (khoảng 11 độ)
slopeMesh.rotation.x = -Math.PI / 2 + 0.2;
scene.add(slopeMesh);

///////////////////////////
function resize() {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

window.addEventListener("resize", resize);

//////////////////////////////////////

//============================
// THẾ GIỚI VẬT LÝ (CANNON-ES)
//============================

const world = new CANNON.World({
  gravity: new CANNON.Vec3(0, -9.82, 0), // luc hut keo xuong truc y
});

// toi uu hoa thuat toan va cham (Broadphase) giup game muot hon khi co nhieu vat the
world.broadphase = new CANNON.SAPBroadphase(world);
world.allowSleep = true; // co phep cac vat dung yen "sleep" de tiet kiem cpu

// body vat ly
const sphereShape = new CANNON.Sphere(0.2); // kich thuoc phai y het ben Three.js
const sphereBody = new CANNON.Body({
  mass: 1, // nang 1kg (neu mass = 0 vat do se troi lo lung hoac dong dinh tai cho)
  shape: sphereShape,
  position: new CANNON.Vec3(0, 5, 0), // dat tren cao 5m de no roi xuong
});
world.addBody(sphereBody);

//======
// Tao mat dat vat ly
//======

const groundShape = new CANNON.Plane();
const groundBody = new CANNON.Body({
  mass: 0,
  shape: groundShape,
});
// luu y quan trong
// mat phang Plance cua Cannon mac dinh dung dung(giong buc tuong)
// phai xoay no nam ngua ra -Math.Pi/2 de lam san nha

groundBody.quaternion.setFromEuler(-Math.PI / 2 + 0.2, 0, 0);

world.addBody(groundBody);

//////////////////////////////////////

const clock = new THREE.Clock();

function tick() {
  const elapsedTime = clock.getElapsedTime();

  //   sphere.rotation.x = elapsedTime * 0.4;
  //   sphere.rotation.y = elapsedTime * 0.6;

  const delta = clock.getDelta();

  // cho the gioi vat ly tien ve phia truoc 1 buoc (1/60s)
  world.step(1 / 60);
  // copy toa do tu body (vat ly) sang Mesh (do hoa)
  sphere.position.copy(sphereBody.position);
  sphere.quaternion.copy(sphereBody.quaternion); // copy ca goc quay

  controls.update();
  renderer.render(scene, camera);
  window.requestAnimationFrame(tick);
}

tick();
