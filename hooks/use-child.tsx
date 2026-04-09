import React, { createContext, useContext } from 'react';

type ChildContextType = {
    childId: string | null;
    childName: string | null;
    inviteCode: string | null;
    setChild: (id: string, name: string, code: string) => Promise<void>;
};

export const ChildContext = createContext<ChildContextType>({
    childId: null,
    childName: null,
    inviteCode: null,
    setChild: async () => {},
});

export const useChild = () => useContext(ChildContext);
