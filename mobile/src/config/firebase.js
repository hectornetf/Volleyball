import { initializeApp } from "firebase/app";
// import { getFirestore } from "firebase/firestore";

// Substitua pelas credenciais do seu projeto gratuito no Firebase
const firebaseConfig = {
  apiKey: "Sua_Api_Key",
  authDomain: "Seu_App.firebaseapp.com",
  projectId: "Seu_Project_Id",
  storageBucket: "Seu_App.appspot.com",
  messagingSenderId: "Id_Mensagem",
  appId: "App_Id"
};

const app = initializeApp(firebaseConfig);
// export const db = getFirestore(app);
