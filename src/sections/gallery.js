import { escapeHtml, createSection } from '../utils.js';

export function renderGallery(imagePaths) {
  if (!imagePaths.length) {
    return createSection('image carousel', '<p>No images found in the gallery.</p>');
  }

  const section = createSection('image carousel', `
    <div class="carousel-container">
      <div class="carousel-track">
        ${imagePaths.map((path, i) => `
          <div class="carousel-slide${i === 0 ? ' active' : ''}">
            <img src="${escapeHtml(path)}" alt="Gallery Image ${i + 1}">
          </div>
        `).join('')}
      </div>
      <button class="carousel-nav prev">❮</button>
      <button class="carousel-nav next">❯</button>
      <div class="carousel-dots">
        ${imagePaths.map((_, i) => `<span class="dot${i === 0 ? ' active' : ''}" data-slide-index="${i}"></span>`).join('')}
      </div>
    </div>
  `);

  const carousel = section.querySelector('.carousel-container');
  const track = carousel.querySelector('.carousel-track');
  const dots = [...carousel.querySelectorAll('.dot')];
  let currentIndex = 0;
  const total = imagePaths.length;

  function updateCarousel() {
    track.style.transform = `translateX(-${currentIndex * 100}%)`;
    dots.forEach((dot, i) => dot.classList.toggle('active', i === currentIndex));
  }

  carousel.querySelector('.prev').addEventListener('click', () => {
    currentIndex = currentIndex === 0 ? total - 1 : currentIndex - 1;
    updateCarousel();
  });

  carousel.querySelector('.next').addEventListener('click', () => {
    currentIndex = currentIndex === total - 1 ? 0 : currentIndex + 1;
    updateCarousel();
  });

  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      currentIndex = parseInt(dot.dataset.slideIndex, 10);
      updateCarousel();
    });
  });

  return section;
}
