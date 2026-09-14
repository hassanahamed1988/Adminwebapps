import React from 'react';
import { Search } from 'lucide-react';
import FloatingInput from './FloatingInput';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

const SearchInput: React.FC<Props> = ({ value, onChange, placeholder }) => {
  const { t } = useLanguage();
  return (
    <FloatingInput
      label={(placeholder || t('common.search')).replace(/\.{3}$/, '')}
      icon={Search}
      value={value}
      onChange={onChange}
    />
  );
};

export default SearchInput;
