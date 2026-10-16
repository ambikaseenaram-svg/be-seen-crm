"use client";

import { cloneElement, isValidElement, useId } from "react";

export function Champ({
  libelle,
  erreur,
  obligatoire,
  children,
  className = "",
}: {
  libelle: string;
  erreur?: string;
  obligatoire?: boolean;
  children: React.ReactElement<{ id?: string }>;
  className?: string;
}) {
  const idAuto = useId();
  const id = (isValidElement(children) && children.props.id) || idAuto;
  // Étiquette reliée par identifiant, message d'erreur à part : le nom du champ reste « libelle ».
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-titre">
        {libelle}
        {obligatoire && <span className="text-violet" aria-hidden> *</span>}
      </label>
      {isValidElement(children) ? cloneElement(children, { id }) : children}
      {erreur && (
        <span role="alert" className="message-erreur block">
          {erreur}
        </span>
      )}
    </div>
  );
}

export function Liste({
  valeurs,
  value,
  onChange,
  vide = "—",
  erreur,
  name,
  id,
}: {
  id?: string;
  valeurs: readonly string[];
  value: string;
  onChange: (v: string) => void;
  vide?: string;
  erreur?: boolean;
  name?: string;
}) {
  return (
    <select id={id} name={name} value={value} onChange={(e) => onChange(e.target.value)} className={`champ ${erreur ? "champ-erreur" : ""}`}>
      <option value="">{vide}</option>
      {valeurs.map((v) => (
        <option key={v} value={v}>
          {v}
        </option>
      ))}
    </select>
  );
}
