import React, { createContext, useState, useEffect, useContext } from 'react';
import { getSavedGroupId, saveGroupId, clearSession } from '../services/sessionService';

const SessionContext = createContext();

export const SessionProvider = ({ children }) => {
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Recupera a sessão (Código do Vôlei) salva no celular
    const loadSession = async () => {
      const savedId = await getSavedGroupId();
      setActiveGroupId(savedId);
      setLoading(false);
    };
    loadSession();
  }, []);

  const loginAsGroup = async (code) => {
    setActiveGroupId(code);
    await saveGroupId(code);
  };

  const logout = async () => {
    await clearSession();
    setActiveGroupId(null);
  };

  return (
    <SessionContext.Provider value={{
      activeGroupId,
      loading,
      loginAsGroup,
      logout
    }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => useContext(SessionContext);
