import { escapeHtml, autolink } from '../utils.js';

export function renderBlogger(posts) {
  const wrapper = document.createElement('div');
  wrapper.className = 'section';

  if (!posts.length) {
    wrapper.innerHTML = '<p>No posts to display.</p>';
    return wrapper;
  }

  const sorted = [...posts].sort((a, b) => b.date.localeCompare(a.date));
  wrapper.innerHTML = sorted.map((post) => {
    const content = autolink(post.content);
    return `
      <section class="post-item" data-id="${escapeHtml(post.id)}">
        <p class="post-date"><small>${escapeHtml(post.date)}</small></p>
        <div class="post-title-wrap">
          <h2>${escapeHtml(post.title)}</h2>
        </div>
        <div class="post-content">
          <div class="post-summary">${content}</div>
          <div class="post-full">${content}</div>
        </div>
        <p><a href="#" class="read-more-toggle">Read more...</a></p>
      </section>
      <hr>
    `;
  }).join('');

  wrapper.querySelectorAll('.read-more-toggle').forEach((button) => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const section = button.closest('.post-item');
      const isExpanded = section.classList.contains('expanded');

      wrapper.querySelectorAll('.post-item.expanded').forEach((other) => {
        if (other !== section) {
          other.classList.remove('expanded');
          const toggle = other.querySelector('.read-more-toggle');
          if (toggle) toggle.textContent = 'Read more...';
        }
      });

      if (!isExpanded) {
        section.classList.add('expanded');
        button.textContent = 'Show less...';
      } else {
        section.classList.remove('expanded');
        button.textContent = 'Read more...';
      }
    });
  });

  function checkOverflow() {
    wrapper.querySelectorAll('.post-summary').forEach((summary) => {
      const overflowing = summary.scrollHeight > summary.clientHeight;
      const toggle = summary.closest('.post-item')?.querySelector('.read-more-toggle');
      if (toggle) toggle.style.display = overflowing ? 'block' : 'none';
    });
  }

  window.addEventListener('load', checkOverflow);
  window.addEventListener('resize', checkOverflow);
  requestAnimationFrame(checkOverflow);

  return wrapper;
}
