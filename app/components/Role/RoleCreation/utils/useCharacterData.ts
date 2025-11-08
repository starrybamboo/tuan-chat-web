import { useCallback, useEffect, useMemo, useState } from "react";

import { useRuleDetailQuery } from "api/hooks/ruleQueryHooks";

import type { CharacterData } from "../types";

type CharacterSectionKey = "act" | "basic" | "ability" | "skill";

type TemplateMergeStrategy = "replace" | "preserveExisting";

type UseCharacterDataOptions = {
  initialData?: CharacterData;
  templateMergeStrategy?: TemplateMergeStrategy;
};

type CharacterDataHandlers = {
  characterData: CharacterData;
  setCharacterData: React.Dispatch<React.SetStateAction<CharacterData>>;
  selectedRuleId: number;
  isValidRuleId: boolean;
  handleCharacterDataChange: (data: Partial<CharacterData>) => void;
  handleAttributeChange: (section: CharacterSectionKey, key: string, value: string) => void;
  handleAddField: (section: CharacterSectionKey, key: string, value: string) => void;
  handleDeleteField: (section: CharacterSectionKey, key: string) => void;
  handleRenameField: (section: CharacterSectionKey, oldKey: string, newKey: string) => void;
  handleRuleChange: (ruleId: number) => void;
};

const EMPTY_CHARACTER_DATA: CharacterData = {
  name: "",
  description: "",
  avatar: "",
  ruleId: 0,
  act: {},
  basic: {},
  ability: {},
  skill: {},
};

const hasContent = (section?: Record<string, string>) => Boolean(section && Object.keys(section).length);

const cloneSection = (section?: Record<string, string>) => ({ ...(section ?? {}) });

export function useCharacterData(options: UseCharacterDataOptions = {}): CharacterDataHandlers {
  const { initialData, templateMergeStrategy = "replace" } = options;
  const [characterData, setCharacterData] = useState<CharacterData>(initialData ?? EMPTY_CHARACTER_DATA);
  const [loadedRuleId, setLoadedRuleId] = useState<number>(0);

  const selectedRuleId = characterData.ruleId || 0;
  const isValidRuleId = useMemo(() => !Number.isNaN(selectedRuleId) && selectedRuleId > 0, [selectedRuleId]);
  const { data: ruleDetail } = useRuleDetailQuery(selectedRuleId, { enabled: isValidRuleId });

  useEffect(() => {
    if (!isValidRuleId || !ruleDetail || loadedRuleId === selectedRuleId)
      return;

    // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
    setCharacterData((prev) => {
      const mergeSection = (sectionKey: CharacterSectionKey, template?: Record<string, string>) => {
        if (templateMergeStrategy === "preserveExisting" && hasContent(prev[sectionKey]))
          return prev[sectionKey];
        return cloneSection(template);
      };

      return {
        ...prev,
        act: mergeSection("act", ruleDetail.actTemplate),
        basic: mergeSection("basic", ruleDetail.basicDefault),
        ability: mergeSection("ability", ruleDetail.abilityFormula),
        skill: mergeSection("skill", ruleDetail.skillDefault),
      };
    });

    // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
    setLoadedRuleId(selectedRuleId);
  }, [isValidRuleId, ruleDetail, loadedRuleId, selectedRuleId, templateMergeStrategy]);

  const handleCharacterDataChange = useCallback((data: Partial<CharacterData>) => {
    setCharacterData(prev => ({ ...prev, ...data }));
  }, []);

  const handleAttributeChange = useCallback((section: CharacterSectionKey, key: string, value: string) => {
    setCharacterData(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] as Record<string, string>),
        [key]: value,
      },
    }));
  }, []);

  const handleAddField = useCallback((section: CharacterSectionKey, key: string, value: string) => {
    setCharacterData(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] as Record<string, string>),
        [key]: value,
      },
    }));
  }, []);

  const handleDeleteField = useCallback((section: CharacterSectionKey, key: string) => {
    setCharacterData((prev) => {
      const nextSection = { ...(prev[section] as Record<string, string>) };
      delete nextSection[key];
      return {
        ...prev,
        [section]: nextSection,
      };
    });
  }, []);

  const handleRenameField = useCallback((section: CharacterSectionKey, oldKey: string, newKey: string) => {
    if (!newKey.trim() || oldKey === newKey)
      return;

    setCharacterData((prev) => {
      const currentSection = prev[section] as Record<string, string>;
      if (newKey in currentSection)
        return prev;

      const nextSection = { ...currentSection };
      const value = nextSection[oldKey];
      delete nextSection[oldKey];
      nextSection[newKey] = value;

      return {
        ...prev,
        [section]: nextSection,
      };
    });
  }, []);

  const handleRuleChange = useCallback((ruleId: number) => {
    setCharacterData(prev => ({ ...prev, ruleId }));
    setLoadedRuleId(0);
  }, []);

  return {
    characterData,
    setCharacterData,
    selectedRuleId,
    isValidRuleId,
    handleCharacterDataChange,
    handleAttributeChange,
    handleAddField,
    handleDeleteField,
    handleRenameField,
    handleRuleChange,
  };
}
