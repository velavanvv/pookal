import { createContext, useContext, useState } from 'react';

const BranchContext = createContext(null);

export function BranchProvider({ children }) {
  const [activeBranch, setActiveBranch] = useState(() => {
    try {
      const saved = localStorage.getItem('pookal_branch');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const switchBranch = (branch) => {
    setActiveBranch(branch);
    if (branch) localStorage.setItem('pookal_branch', JSON.stringify(branch));
    else localStorage.removeItem('pookal_branch');
  };

  return (
    <BranchContext.Provider value={{ activeBranch, switchBranch }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  return useContext(BranchContext);
}
