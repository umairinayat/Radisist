import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export default function ThreeHeroBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Get initial dimensions
    let width = window.innerWidth;
    let height = window.innerHeight;

    // 1. Scene setup
    const scene = new THREE.Scene();

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(60, width / height, 1, 1000);
    camera.position.z = 250;

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 4. Create 3D particles connectome
    const maxParticles = 70;
    const particlePositions = new Float32Array(maxParticles * 3);
    const particlesData = [];

    const group = new THREE.Group();
    scene.add(group);

    const r = 240; // Spreading radius
    const rHalf = r / 2;

    // Generate random positions and velocities
    for (let i = 0; i < maxParticles; i++) {
      const x = Math.random() * r - rHalf;
      const y = Math.random() * r - rHalf;
      const z = Math.random() * r - rHalf;

      particlePositions[i * 3] = x;
      particlePositions[i * 3 + 1] = y;
      particlePositions[i * 3 + 2] = z;

      particlesData.push({
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.5
        ),
        numConnections: 0,
      });
    }

    // Points Material
    // Create a circular point texture programmatically
    const createCircleTexture = () => {
      const c = document.createElement("canvas");
      c.width = 16;
      c.height = 16;
      const ctx = c.getContext("2d");
      ctx.beginPath();
      ctx.arc(8, 8, 7, 0, Math.PI * 2);
      ctx.fillStyle = "#6C1B36";
      ctx.fill();
      return new THREE.CanvasTexture(c);
    };

    const pointsGeometry = new THREE.BufferGeometry();
    pointsGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(particlePositions, 3)
    );

    const pointsMaterial = new THREE.PointsMaterial({
      color: 0x6c1b36,
      size: 5,
      map: createCircleTexture(),
      transparent: true,
      opacity: 0.75,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });

    const pointCloud = new THREE.Points(pointsGeometry, pointsMaterial);
    group.add(pointCloud);

    // Line Connections setup
    const linePositions = new Float32Array(maxParticles * maxParticles * 3);
    const lineColors = new Float32Array(maxParticles * maxParticles * 3);

    const linesGeometry = new THREE.BufferGeometry();
    linesGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(linePositions, 3)
    );
    linesGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(lineColors, 3)
    );

    const linesMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.22,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });

    const lineSegments = new THREE.LineSegments(linesGeometry, linesMaterial);
    group.add(lineSegments);

    // 5. Mouse hover tracking
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (e) => {
      mouseX = e.clientX - window.innerWidth / 2;
      mouseY = e.clientY - window.innerHeight / 2;
    };

    window.addEventListener("mousemove", handleMouseMove);

    // 6. Animation loop
    let animationFrameId;
    const minDistance = 75;

    const animate = () => {
      // Smooth camera interpolation based on mouse offsets
      targetX += (mouseX - targetX) * 0.05;
      targetY += (mouseY - targetY) * 0.05;

      camera.position.x = targetX * 0.15;
      camera.position.y = -targetY * 0.15;
      camera.lookAt(scene.position);

      // Rotate network group slowly
      group.rotation.y += 0.0012;
      group.rotation.x += 0.0006;

      let vertexIndex = 0;
      let colorIndex = 0;

      // Update particle positions
      const positions = pointsGeometry.attributes.position.array;

      for (let i = 0; i < maxParticles; i++) {
        const pData = particlesData[i];

        positions[i * 3] += pData.velocity.x;
        positions[i * 3 + 1] += pData.velocity.y;
        positions[i * 3 + 2] += pData.velocity.z;

        // Bounce particle bounds
        if (positions[i * 3] < -rHalf || positions[i * 3] > rHalf) {
          pData.velocity.x = -pData.velocity.x;
        }
        if (positions[i * 3 + 1] < -rHalf || positions[i * 3 + 1] > rHalf) {
          pData.velocity.y = -pData.velocity.y;
        }
        if (positions[i * 3 + 2] < -rHalf || positions[i * 3 + 2] > rHalf) {
          pData.velocity.z = -pData.velocity.z;
        }
      }

      pointsGeometry.attributes.position.needsUpdate = true;

      // Compute connection lines
      for (let i = 0; i < maxParticles; i++) {
        for (let j = i + 1; j < maxParticles; j++) {
          const dx = positions[i * 3] - positions[j * 3];
          const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
          const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < minDistance) {
            // Add lines vertex positions
            linePositions[vertexIndex++] = positions[i * 3];
            linePositions[vertexIndex++] = positions[i * 3 + 1];
            linePositions[vertexIndex++] = positions[i * 3 + 2];

            linePositions[vertexIndex++] = positions[j * 3];
            linePositions[vertexIndex++] = positions[j * 3 + 1];
            linePositions[vertexIndex++] = positions[j * 3 + 2];

            // Soft color gradient mapping (fade lines based on distance)
            const alpha = 1.0 - dist / minDistance;
            
            // Maroon connectome color (RGB: 108, 27, 54)
            lineColors[colorIndex++] = (108 / 255) * alpha;
            lineColors[colorIndex++] = (27 / 255) * alpha;
            lineColors[colorIndex++] = (54 / 255) * alpha;

            lineColors[colorIndex++] = (108 / 255) * alpha;
            lineColors[colorIndex++] = (27 / 255) * alpha;
            lineColors[colorIndex++] = (54 / 255) * alpha;
          }
        }
      }

      linesGeometry.setDrawRange(0, vertexIndex / 3);
      linesGeometry.attributes.position.needsUpdate = true;
      linesGeometry.attributes.color.needsUpdate = true;

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    // 7. Resize handling
    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener("resize", handleResize);

    // Start loop
    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      pointsGeometry.dispose();
      pointsMaterial.dispose();
      linesGeometry.dispose();
      linesMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 w-full h-full pointer-events-none opacity-85 transition-opacity duration-1000"
      style={{ mixBlendMode: "multiply" }}
    />
  );
}
