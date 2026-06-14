// ═══════════════════════════════════
//  PORTFOLIO JAVASCRIPT
// ═══════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {

  // ─── Navbar scroll effect ───
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.style.background = window.scrollY > 50
      ? 'rgba(13, 17, 23, 0.98)'
      : 'rgba(13, 17, 23, 0.85)';
  });

  // ─── Mobile menu ───
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  if (hamburger) {
    hamburger.addEventListener('click', () => {
      mobileMenu.classList.toggle('open');
    });
    mobileMenu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => mobileMenu.classList.remove('open'));
    });
  }

  // ─── Typed text effect ───
  const typed = document.getElementById('typedText');
  if (typed) {
    const texts = [
      'Full Stack Developer',
      'مطور ويب',
      'Python Flask Dev',
      'Software Engineer',
      'مصمم واجهات',
    ];
    let textIdx = 0, charIdx = 0, deleting = false;

    function typeLoop() {
      const current = texts[textIdx];
      if (!deleting) {
        typed.textContent = current.slice(0, ++charIdx);
        if (charIdx === current.length) {
          deleting = true;
          setTimeout(typeLoop, 2000);
          return;
        }
      } else {
        typed.textContent = current.slice(0, --charIdx);
        if (charIdx === 0) {
          deleting = false;
          textIdx = (textIdx + 1) % texts.length;
        }
      }
      setTimeout(typeLoop, deleting ? 60 : 100);
    }
    typeLoop();
  }

  // ─── Skill bars animate on scroll ───
  const skillFills = document.querySelectorAll('.skill-fill');
  if (skillFills.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const target = entry.target.dataset.target;
          entry.target.style.width = target + '%';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    skillFills.forEach(el => observer.observe(el));
  }

  // ─── Project filter tabs ───
  const filterBtns = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('.project-card');
  if (filterBtns.length) {
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.dataset.filter;
        cards.forEach(card => {
          let show = true;
          if (filter === 'featured') show = card.dataset.featured === '1';
          if (filter === 'sale') show = card.dataset.sale === '1';
          card.style.display = show ? '' : 'none';
          card.style.animation = show ? 'fadeIn 0.3s ease' : '';
        });
      });
    });
  }

  // ─── Contact form AJAX ───
  const form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type=submit]');
      const orig = btn.innerHTML;
      btn.innerHTML = '<span>جاري الإرسال...</span>';
      btn.disabled = true;
      try {
        const res = await fetch('/contact', {
          method: 'POST',
          body: new FormData(form)
        });
        const data = await res.json();
        if (data.success) {
          document.getElementById('formSuccess').style.display = 'block';
          form.reset();
          setTimeout(() => {
            document.getElementById('formSuccess').style.display = 'none';
          }, 5000);
        }
      } catch (err) {
        console.error(err);
      } finally {
        btn.innerHTML = orig;
        btn.disabled = false;
      }
    });
  }

  // ─── Scroll reveal for cards ───
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.project-card, .skill-card, .contact-card, .about-info-grid .info-item').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    revealObserver.observe(el);
  });

  // ─── Smooth scroll for anchor links ───
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

});
