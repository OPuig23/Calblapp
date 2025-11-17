importScripts("https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBOhdRzek_69nWPk2PmhvS3IQq62x0WziU",
  authDomain: "cal-blay-webapp.firebaseapp.com",
  projectId: "cal-blay-webapp",
  storageBucket: "cal-blay-webapp.firebasestorage.app",
  messagingSenderId: "242061830816",
  appId: "1:242061830816:web:940d37f1a5c3fdd2f2f7c5",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[CalBlay] Background push:', payload);

  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/icons/icon-192.png",
  });
});
