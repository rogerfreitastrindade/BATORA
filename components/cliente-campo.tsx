/* Campo de cliente com busca (autocomplete): digite para achar um cliente já cadastrado.
   Se digitar um nome novo, ele é cadastrado automaticamente ao salvar. */
export function ClienteCampo({
  nomes, id, obrigatorio = false, valorInicial = "", rotulo = "Cliente", autoFocus = false,
}: {
  nomes: string[]; id: string; obrigatorio?: boolean; valorInicial?: string;
  rotulo?: string; autoFocus?: boolean;
}) {
  const listaId = `${id}-lista`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-semibold text-suave uppercase">{rotulo}</label>
      <input
        id={id}
        name="cliente"
        list={listaId}
        required={obrigatorio}
        defaultValue={valorInicial}
        autoFocus={autoFocus}
        autoComplete="off"
        placeholder="Digite para buscar ou cadastrar"
        className="h-12 rounded-xl bg-fundo border border-borda px-3 text-base w-full uppercase"
      />
      <datalist id={listaId}>
        {nomes.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <p className="text-[11px] text-suave">
        Comece a digitar para buscar um cliente já cadastrado. Nome novo é cadastrado sozinho.
      </p>
    </div>
  );
}
