/**
 * Exercise Animation System
 * Renders stick figure animations demonstrating proper exercise form
 */

class ExerciseAnimator {
  constructor(canvasId, exerciseName) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      console.warn(`Canvas with id "${canvasId}" not found`);
      return;
    }
    
    this.ctx = this.canvas.getContext('2d');
    this.exerciseName = exerciseName;
    this.isAnimating = false;
    this.frame = 0;
    this.animationId = null;
    
    // Set canvas size
    this.canvas.width = 400;
    this.canvas.height = 500;
    
    // Get animation definition
    this.animation = EXERCISE_ANIMATIONS[exerciseName.toLowerCase()] || null;
    
    if (this.animation) {
      this.totalFrames = this.animation.frames.length;
      this.frameDelay = this.animation.frameDelay || 5;
    }
  }

  // Draw a circle (for joints)
  drawCircle(x, y, radius, color = '#00d4ff') {
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  // Draw a line (for limbs)
  drawLine(x1, y1, x2, y2, color = '#00d4ff', width = 4) {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
  }

  // Draw stick figure with given positions
  drawFigure(positions) {
    const scale = 1;
    const offsetX = this.canvas.width / 2;
    const offsetY = this.canvas.height / 2;

    // Extract positions
    const head = positions.head;
    const neck = positions.neck;
    const shoulders = positions.shoulders;
    const elbow_l = positions.elbow_l;
    const elbow_r = positions.elbow_r;
    const hand_l = positions.hand_l;
    const hand_r = positions.hand_r;
    const hips = positions.hips;
    const knee_l = positions.knee_l;
    const knee_r = positions.knee_r;
    const foot_l = positions.foot_l;
    const foot_r = positions.foot_r;

    // Draw head
    this.drawCircle(offsetX + head.x * scale, offsetY + head.y * scale, 20, '#d4af37');

    // Draw torso
    this.drawLine(
      offsetX + neck.x * scale, offsetY + neck.y * scale,
      offsetX + hips.x * scale, offsetY + hips.y * scale,
      '#00d4ff', 5
    );

    // Draw shoulders
    this.drawLine(
      offsetX + shoulders.x * scale, offsetY + shoulders.y * scale,
      offsetX + shoulders.x * scale - 40, offsetY + shoulders.y * scale,
      '#00d4ff', 4
    );
    this.drawLine(
      offsetX + shoulders.x * scale, offsetY + shoulders.y * scale,
      offsetX + shoulders.x * scale + 40, offsetY + shoulders.y * scale,
      '#00d4ff', 4
    );

    // Draw left arm
    this.drawLine(
      offsetX + (shoulders.x - 40) * scale, offsetY + shoulders.y * scale,
      offsetX + elbow_l.x * scale, offsetY + elbow_l.y * scale,
      '#00d4ff', 4
    );
    this.drawLine(
      offsetX + elbow_l.x * scale, offsetY + elbow_l.y * scale,
      offsetX + hand_l.x * scale, offsetY + hand_l.y * scale,
      '#00d4ff', 4
    );

    // Draw right arm
    this.drawLine(
      offsetX + (shoulders.x + 40) * scale, offsetY + shoulders.y * scale,
      offsetX + elbow_r.x * scale, offsetY + elbow_r.y * scale,
      '#00d4ff', 4
    );
    this.drawLine(
      offsetX + elbow_r.x * scale, offsetY + elbow_r.y * scale,
      offsetX + hand_r.x * scale, offsetY + hand_r.y * scale,
      '#00d4ff', 4
    );

    // Draw left leg
    this.drawLine(
      offsetX + hips.x * scale, offsetY + hips.y * scale,
      offsetX + knee_l.x * scale, offsetY + knee_l.y * scale,
      '#00d4ff', 4
    );
    this.drawLine(
      offsetX + knee_l.x * scale, offsetY + knee_l.y * scale,
      offsetX + foot_l.x * scale, offsetY + foot_l.y * scale,
      '#00d4ff', 4
    );

    // Draw right leg
    this.drawLine(
      offsetX + hips.x * scale, offsetY + hips.y * scale,
      offsetX + knee_r.x * scale, offsetY + knee_r.y * scale,
      '#00d4ff', 4
    );
    this.drawLine(
      offsetX + knee_r.x * scale, offsetY + knee_r.y * scale,
      offsetX + foot_r.x * scale, offsetY + foot_r.y * scale,
      '#00d4ff', 4
    );

    // Draw joints
    this.drawCircle(offsetX + elbow_l.x * scale, offsetY + elbow_l.y * scale, 8, '#00d4ff');
    this.drawCircle(offsetX + elbow_r.x * scale, offsetY + elbow_r.y * scale, 8, '#00d4ff');
    this.drawCircle(offsetX + knee_l.x * scale, offsetY + knee_l.y * scale, 8, '#00d4ff');
    this.drawCircle(offsetX + knee_r.x * scale, offsetY + knee_r.y * scale, 8, '#00d4ff');
  }

  // Draw background and ground
  drawBackground() {
    // Background
    this.ctx.fillStyle = 'rgba(26, 31, 46, 0.8)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Grid
    this.ctx.strokeStyle = 'rgba(0, 212, 255, 0.1)';
    this.ctx.lineWidth = 1;
    for (let i = 0; i < this.canvas.width; i += 50) {
      this.ctx.beginPath();
      this.ctx.moveTo(i, 0);
      this.ctx.lineTo(i, this.canvas.height);
      this.ctx.stroke();
    }
    for (let i = 0; i < this.canvas.height; i += 50) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, i);
      this.ctx.lineTo(this.canvas.width, i);
      this.ctx.stroke();
    }

    // Ground line
    this.ctx.strokeStyle = '#d4af37';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.canvas.height - 50);
    this.ctx.lineTo(this.canvas.width, this.canvas.height - 50);
    this.ctx.stroke();
  }

  // Draw instruction text
  drawText(text) {
    this.ctx.fillStyle = '#f5f7fa';
    this.ctx.font = 'bold 16px Inter, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(text, this.canvas.width / 2, 30);
  }

  // Play animation loop
  play() {
    if (!this.animation) {
      console.warn(`No animation found for "${this.exerciseName}"`);
      return;
    }

    this.isAnimating = true;
    this.frame = 0;
    this.animate();
  }

  // Animation frame
  animate = () => {
    if (!this.isAnimating) return;

    const frameIndex = Math.floor(this.frame / this.frameDelay) % this.animation.frames.length;
    const currentFrame = this.animation.frames[frameIndex];

    // Draw everything
    this.drawBackground();
    this.drawFigure(currentFrame.positions);
    this.drawText(currentFrame.label || this.exerciseName);

    // Next frame
    this.frame++;
    this.animationId = requestAnimationFrame(this.animate);
  };

  // Stop animation
  stop() {
    this.isAnimating = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  // Toggle play/pause
  togglePlay() {
    if (this.isAnimating) {
      this.stop();
    } else {
      this.play();
    }
  }
}

// Export for use in HTML
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExerciseAnimator;
}
