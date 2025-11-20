import * as THREE from "three";
import TWEEN from "three/addons/libs/tween.module.js";
import { TrackballControls } from "three/addons/controls/TrackballControls.js";
import { CSS3DRenderer, CSS3DObject } from "three/addons/renderers/CSS3DRenderer.js";

// Colors for net worth
const COLORS = ['#ef3022','#f04c34','#f26132','#f47f30','#f68f32','#f99d31','#fdba36','#fdca35','#ffd93b','#eee937','#d5df31','#b0ce34','#7cb643','#5dab46','#3a9f48'];

let camera, scene, renderer, controls;
const objects = [];
const targets = { table: [], sphere: [], helix: [], grid: [] };

// Load CSV
async function loadCSV(url) {
  const resp = await fetch(url);
  const text = await resp.text();
  const lines = text.trim().split('\n');
  const data = [];
  for (const line of lines) {
    const cols = line.split(/\s(?=https?:\/\/)/); // split before photo URL
    const rest = cols[1].split(' ');
    data.push({
      name: cols[0],
      photo: rest[0],
      age: rest[1],
      country: rest[2],
      interest: rest[3],
      netWorth: parseFloat(rest[4].replace(/[$,]/g,''))
    });
  }
  return data;
}

// Map net worth to color
function getColor(netWorth, min, max) {
  const index = Math.floor((netWorth - min)/(max-min) * (COLORS.length-1));
  return COLORS[Math.max(0, Math.min(index, COLORS.length-1))];
}

async function init() {
  const data = await loadCSV('https://docs.google.com/spreadsheets/d/e/2PACX-1vTdQ8324RdvqZwBjWEXJj-C9-GE1BIKfYNwNcKA4doOJC5Qi-zR0vWJOEfE3h_WGLYsMMaycNnRaDxY/pub?gid=0&single=true&output=csv');

  const netMin = Math.min(...data.map(d=>d.netWorth));
  const netMax = Math.max(...data.map(d=>d.netWorth));

  camera = new THREE.PerspectiveCamera(40, window.innerWidth/window.innerHeight, 1, 10000);
  camera.position.z = 3000;

  scene = new THREE.Scene();

  // create elements
  for (let i=0; i<data.length; i++) {
    const d = data[i];

    const element = document.createElement('div');
    element.className = 'element';
    const color = getColor(d.netWorth, netMin, netMax);
    element.style.border = `5px solid ${color}`;
    element.style.backgroundColor = color + '55';

    const topRow = document.createElement('div');
    topRow.className = 'top-row';
    topRow.innerHTML = `<span>${d.country}</span><span>${d.age}</span>`;
    element.appendChild(topRow);

    const photoDiv = document.createElement('div');
    photoDiv.className = 'photo';
    photoDiv.style.backgroundImage = `url(${d.photo})`;
    element.appendChild(photoDiv);

    const bottomRow = document.createElement('div');
    bottomRow.className = 'bottom-row';
    bottomRow.textContent = d.interest;
    element.appendChild(bottomRow);

    const obj = new CSS3DObject(element);
    obj.position.x = Math.random()*4000-2000;
    obj.position.y = Math.random()*4000-2000;
    obj.position.z = Math.random()*4000-2000;
    scene.add(obj);
    objects.push(obj);
  }

  const vector = new THREE.Vector3();

  // Table layout
  for (let i=0;i<objects.length;i++){
    const obj = new THREE.Object3D();
    const x = (i%20)*160 - 1600;
    const y = -Math.floor(i/20)*190 + 900;
    obj.position.set(x,y,0);
    targets.table.push(obj);
  }

  // Sphere layout
  for (let i=0;i<objects.length;i++){
    const phi = Math.acos(-1 + (2*i)/objects.length);
    const theta = Math.sqrt(objects.length*Math.PI)*phi;
    const obj = new THREE.Object3D();
    obj.position.setFromSphericalCoords(1000, phi, theta);
    vector.copy(obj.position).multiplyScalar(2);
    obj.lookAt(vector);
    targets.sphere.push(obj);
  }

  // Helix layout
  for (let i=0;i<objects.length;i++){
    const theta = i*0.175 + Math.PI;
    const y = -i*12 + 500;
    const obj = new THREE.Object3D();
    obj.position.setFromCylindricalCoords(900, theta, y);
    vector.set(obj.position.x*2, obj.position.y, obj.position.z*2);
    obj.lookAt(vector);
    targets.helix.push(obj);
  }

  // Grid layout x=5 y=4 z=10
  for (let i=0;i<objects.length;i++){
    const obj = new THREE.Object3D();
    const x = (i%5)*400 - 800;
    const y = -Math.floor(i/5 % 4)*400 + 600;
    const z = Math.floor(i/20)*200 - 1000;
    obj.position.set(x,y,z);
    targets.grid.push(obj);
  }

  renderer = new CSS3DRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('container').appendChild(renderer.domElement);

  controls = new TrackballControls(camera, renderer.domElement);
  controls.minDistance = 500;
  controls.maxDistance = 6000;
  controls.addEventListener('change', render);

  // Buttons
  document.getElementById('btnTable').addEventListener('click', ()=>transform(targets.table,2000));
  document.getElementById('btnSphere').addEventListener('click', ()=>transform(targets.sphere,2000));
  document.getElementById('btnHelix').addEventListener('click', ()=>transform(targets.helix,2000));
  document.getElementById('btnGrid').addEventListener('click', ()=>transform(targets.grid,2000));

  transform(targets.table,2000);
  window.addEventListener('resize', onWindowResize);
}

function transform(targets, duration){
  TWEEN.removeAll();
  for (let i=0;i<objects.length;i++){
    const object = objects[i];
    const target = targets[i];
    new TWEEN.Tween(object.position)
      .to({x: target.position.x, y: target.position.y, z: target.position.z}, duration)
      .easing(TWEEN.Easing.Exponential.InOut)
      .start();
    new TWEEN.Tween(object.rotation)
      .to({x: target.rotation.x, y: target.rotation.y, z: target.rotation.z}, duration)
      .easing(TWEEN.Easing.Exponential.InOut)
      .start();
  }
  new TWEEN.Tween(this).to({}, duration*2).onUpdate(render).start();
}

function onWindowResize(){
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  render();
}

function animate(){
  requestAnimationFrame(animate);
  TWEEN.update();
  controls.update();
}

function render(){ renderer.render(scene,camera); }

init();
