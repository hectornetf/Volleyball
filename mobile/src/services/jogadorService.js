import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";

const COLLECTION_NAME = "jogadores";

// Função para CADASTRAR novo jogador
export const addJogador = async (jogadorData) => {
  return await addDoc(collection(db, COLLECTION_NAME), jogadorData);
};

// Listener REAL-TIME para retornar o elenco na tela sempre que algo mudar na nuvem
export const subscribeJogadores = (callback, onError) => {
  const collectionRef = collection(db, COLLECTION_NAME);
  // O onSnapshot ouve ativamente. Toda vez que o Firestore muda, o callback é chamado!
  return onSnapshot(collectionRef, (snapshot) => {
    const lista = [];
    snapshot.forEach((doc) => {
      lista.push({ id: doc.id, ...doc.data() });
    });
    // Ordenar alfabeticamente ou por nível
    lista.sort((a, b) => b.nivel - a.nivel || a.nome.localeCompare(b.nome));
    callback(lista);
  }, (error) => {
    if (onError) onError(error);
  });
};

// Funções para futuras edições/exclusões
export const updateJogador = async (id, data) => {
  return await updateDoc(doc(db, COLLECTION_NAME, id), data);
};

export const deleteJogador = async (id) => {
  return await deleteDoc(doc(db, COLLECTION_NAME, id));
};
