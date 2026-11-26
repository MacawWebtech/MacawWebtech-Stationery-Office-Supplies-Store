/* Demo form UX: validation and confirmation states. Connect to a service for real submissions. */
(() => {
  'use strict';

  const announce = (form, message, isError = false) => {
    if (!(form instanceof HTMLFormElement)) return;
    const target = form.querySelector('.form-message');
    if (!target) return;
    target.textContent = message;
    target.classList.toggle('is-error', isError);
  };

  document.querySelectorAll('[data-async-form]').forEach((form) => {
    if (!(form instanceof HTMLFormElement)) return;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      if (form.id === 'registerForm') {
        const password = form.querySelector('#registerPassword');
        const confirmPassword = form.querySelector('#confirmPassword');
        if (password instanceof HTMLInputElement && confirmPassword instanceof HTMLInputElement && password.value !== confirmPassword.value) {
          announce(form, 'The passwords do not match. Please check both fields.', true);
          confirmPassword.focus();
          return;
        }
      }

      const fileInput = form.querySelector('input[type="file"]');
      const selectedFile = fileInput instanceof HTMLInputElement ? fileInput.files?.[0] : null;
      if (selectedFile && selectedFile.size > 10 * 1024 * 1024) {
        announce(form, 'That file is larger than 10 MB. Please choose a smaller file.', true);
        return;
      }

      const submitButton = form.querySelector('button[type="submit"]');
      const originalButtonContent = submitButton instanceof HTMLButtonElement ? submitButton.innerHTML : '';
      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = true;
        submitButton.textContent = 'Please wait…';
      }
      announce(form, '');

      window.setTimeout(() => {
        if (form.id === 'loginForm') announce(form, 'Form validated. Connect an authentication provider to enable sign-in.');
        else if (form.id === 'registerForm') announce(form, 'Details validated. Connect your account service to enable registration.');
        else if (form.id === 'bulkEnquiryForm') announce(form, 'Thank you. Your enquiry is ready to send once this form is connected to your email or backend service.');
        else if (form.id === 'contactForm') announce(form, 'Thank you for your message. Connect an email service to receive this enquiry.');
        else announce(form, 'Thank you for subscribing. Connect your newsletter provider to store this address.');

        if (submitButton instanceof HTMLButtonElement) {
          submitButton.disabled = false;
          submitButton.innerHTML = originalButtonContent;
        }
        if (form.id === 'contactForm' || form.id === 'bulkEnquiryForm') form.reset();
      }, 650);
    });
  });

  document.querySelectorAll('[data-newsletter]').forEach((form) => {
    if (!(form instanceof HTMLFormElement)) return;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      const message = form.querySelector('.form-message');
      if (message) {
        message.textContent = 'Thank you for subscribing. Connect a newsletter provider to save this address.';
        message.classList.remove('is-error');
      }
      form.reset();
    });
  });

  document.querySelectorAll('[data-password-target]').forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) return;
    button.addEventListener('click', () => {
      const input = document.getElementById(button.dataset.passwordTarget || '');
      if (!(input instanceof HTMLInputElement)) return;
      input.type = input.type === 'password' ? 'text' : 'password';
      button.setAttribute('aria-label', input.type === 'password' ? 'Show password' : 'Hide password');
      button.setAttribute('aria-pressed', String(input.type === 'text'));
    });
  });

  const fileInput = document.querySelector('input[type="file"]');
  if (fileInput instanceof HTMLInputElement) {
    fileInput.addEventListener('change', () => {
      const label = fileInput.closest('.file-upload')?.querySelector('.file-name');
      if (label) label.textContent = fileInput.files?.[0]?.name || 'No file selected';
    });
  }

  const forgotPasswordLink = document.getElementById('forgotPasswordLink');
  const forgotPasswordModal = document.getElementById('forgotModal');
  const closeForgotModal = () => {
    if (forgotPasswordModal) forgotPasswordModal.hidden = true;
  };

  if (forgotPasswordLink && forgotPasswordModal) {
    forgotPasswordLink.addEventListener('click', (event) => {
      event.preventDefault();
      forgotPasswordModal.hidden = false;
      forgotPasswordModal.querySelector('input')?.focus();
    });
  }

  const closeForgotButton = document.getElementById('closeForgot');
  if (closeForgotButton) closeForgotButton.addEventListener('click', closeForgotModal);
  const forgotModalCloseButton = forgotPasswordModal?.querySelector('.modal-close');
  if (forgotModalCloseButton) forgotModalCloseButton.addEventListener('click', closeForgotModal);
  if (forgotPasswordModal) {
    forgotPasswordModal.addEventListener('click', (event) => {
      if (event.target === forgotPasswordModal) closeForgotModal();
    });
  }
})();
