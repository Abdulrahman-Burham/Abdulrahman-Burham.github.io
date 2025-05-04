// عند تحميل الصفحة
document.addEventListener("DOMContentLoaded", function () {
    // زر الرجوع للأعلى
    const backToTopBtn = document.getElementById("backToTop");
  
    if (backToTopBtn) {
      window.addEventListener("scroll", function () {
        if (window.scrollY > 300) {
          backToTopBtn.style.display = "block";
        } else {
          backToTopBtn.style.display = "none";
        }
      });
  
      backToTopBtn.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
  
      // تأثير عند الضغط على زر الرجوع للأعلى
      backToTopBtn.addEventListener("mousedown", function () {
        backToTopBtn.style.transform = "scale(0.95)";
      });
      backToTopBtn.addEventListener("mouseup", function () {
        backToTopBtn.style.transform = "scale(1)";
      });
    } else {
      console.warn("زر الرجوع للأعلى غير موجود في الصفحة.");
    }
  
    // تأكيد إرسال النماذج
    const forms = document.querySelectorAll("form");
    if (forms.length > 0) {
      forms.forEach((form) => {
        form.addEventListener("submit", function (e) {
          e.preventDefault();
          alert("تم إرسال النموذج بنجاح. سيتم التواصل معك قريبًا.");
          form.reset();
        });
      });
    } else {
      console.warn("لا توجد نماذج في الصفحة.");
    }
  
    // تفعيل القائمة الجانبية عند الشاشات الصغيرة
    const toggleMenu = document.getElementById("toggleMenu");
    const navLinks = document.getElementById("navLinks");
  
    if (toggleMenu && navLinks) {
      toggleMenu.addEventListener("click", function () {
        navLinks.classList.toggle("d-none");
      });
    } else {
      console.warn("عناصر القائمة الجانبية غير موجودة في الصفحة.");
    }
  
    // تأثير تحميل بسيط
    const loader = document.getElementById("loader");
    if (loader) {
      setTimeout(() => {
        loader.style.display = "none";
        document.body.style.overflow = "auto";
      }, 1000); // زمن التحميل 1 ثانية
    } else {
      console.warn("عنصر التحميل غير موجود في الصفحة.");
    }
  });
  
