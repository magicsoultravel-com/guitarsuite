<?php
// PHP Logic to scan the gallery directory and get image paths
$galleryPath = __DIR__ . '/../uploads/gallery/thumbnails/';
$imageFiles = [];
$error = '';

if (!is_dir($galleryPath)) {
    $error = 'Gallery directory not found: ' . htmlspecialchars($galleryPath);
} else {
    // scandir returns . and .. entries, so we'll filter them out
    $files = array_diff(scandir($galleryPath), ['.', '..']);

    foreach ($files as $file) {
        $filePath = $galleryPath . $file;
        // Basic check for image extensions (you might want a more robust check)
        $fileExtension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        if (in_array($fileExtension, ['jpg', 'jpeg', 'png', 'gif', 'webp'])) {
            // Store the web-accessible path
            $imageFiles[] = 'uploads/gallery/thumbnails/' . htmlspecialchars($file);
        }
    }

    if (empty($imageFiles) && empty($error)) {
        $error = 'No images found in the gallery directory.';
    }
}

// Prepare image data for JavaScript
$imageDataJson = json_encode($imageFiles);

?>

<div class="section gallery-carousel-section">
    <h2>image carousel</h2>
    <?php if ($error) : ?>
            <p><?php echo htmlspecialchars($error); ?></p>
        <?php else : ?>
            <div class="carousel-container">
                <div class="carousel-track">
                    <?php foreach ($imageFiles as $index => $imagePath) : ?>
                        <div class="carousel-slide <?php echo $index === 0 ? 'active' : ''; ?>">
                            <img src="<?php echo htmlspecialchars($imagePath); ?>" alt="Gallery Image <?php echo $index + 1; ?>">
                        </div>
                    <?php endforeach; ?>
                </div>

                <button class="carousel-nav prev">❮</button>
                <button class="carousel-nav next">❯</button>

                <div class="carousel-dots">
                    <?php foreach ($imageFiles as $index => $imagePath) : ?>
                        <span class="dot <?php echo $index === 0 ? 'active' : ''; ?>" data-slide-index="<?php echo $index; ?>"></span>
                    <?php endforeach; ?>
                </div>
            </div>
        <?php endif; ?>
    </div>

<style>
/* Basic Carousel Styles - You'll want to move these to your main style.css */
.carousel-container {
    position: relative;
    width: 100%;
    max-width: 600px; /* Example max-width for the carousel itself */
    margin: 20px auto; /* Center the carousel */
    overflow: hidden; /* Hide overflowing slides */
    border: 1px solid var(--border-light);
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.carousel-track {
    display: flex;
    transition: transform 0.5s ease-in-out; /* Smooth slide transition */
}

.carousel-slide {
    min-width: 100%; /* Each slide takes up 100% of the track's visible width */
    box-sizing: border-box;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-shrink: 0; /* Prevent slides from shrinking */
}

.carousel-slide img {
    max-width: 100%;
    height: auto; /* Maintain aspect ratio */
    display: block;
    border-radius: 8px; /* Match container border-radius */
}

/* Navigation Buttons */
.carousel-nav {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    background-color: rgba(0, 0, 0, 0.5);
    color: white;
    border: none;
    padding: 10px 15px;
    cursor: pointer;
    font-size: 1.5em;
    border-radius: 4px;
    z-index: 10;
    transition: background-color 0.3s ease;
}

.carousel-nav:hover {
    background-color: rgba(0, 0, 0, 0.8);
}

.carousel-nav.prev {
    left: 10px;
}

.carousel-nav.next {
    right: 10px;
}

/* Dots Indicators */
.carousel-dots {
    text-align: center;
    padding: 10px 0;
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: rgba(0,0,0,0.3); /* Semi-transparent background for dots */
    border-bottom-left-radius: 8px;
    border-bottom-right-radius: 8px;
}

.dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    margin: 0 5px;
    background-color: #bbb;
    border-radius: 50%;
    cursor: pointer;
    transition: background-color 0.3s ease;
}

.dot.active {
    background-color: var(--accent-color); /* Use your theme accent color */
}
</style>

<script>
document.addEventListener('DOMContentLoaded', () => {
    const carouselContainer = document.querySelector('.carousel-container');
    if (!carouselContainer) { // Exit if carousel isn't on the page
        return;
    }

    const carouselTrack = carouselContainer.querySelector('.carousel-track');
    const slides = Array.from(carouselTrack.children); // Convert HTMLCollection to Array
    const prevBtn = carouselContainer.querySelector('.carousel-nav.prev');
    const nextBtn = carouselContainer.querySelector('.carousel-nav.next');
    const dotsContainer = carouselContainer.querySelector('.carousel-dots');
    const dots = Array.from(dotsContainer.children);

    let currentIndex = 0;
    const totalSlides = slides.length;

    // Function to update carousel display
    function updateCarousel() {
        // Move the track to show the current slide
        carouselTrack.style.transform = `translateX(-${currentIndex * 100}%)`;

        // Update active dot
        dots.forEach((dot, index) => {
            if (index === currentIndex) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }

    // Event listeners for navigation buttons
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            currentIndex = (currentIndex === 0) ? totalSlides - 1 : currentIndex - 1;
            updateCarousel();
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            currentIndex = (currentIndex === totalSlides - 1) ? 0 : currentIndex + 1;
            updateCarousel();
        });
    }

    // Event listeners for dots
    dots.forEach(dot => {
        dot.addEventListener('click', (e) => {
            currentIndex = parseInt(e.target.dataset.slideIndex);
            updateCarousel();
        });
    });

    // Initial display update
    updateCarousel();
});
</script>
