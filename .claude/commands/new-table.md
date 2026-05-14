# /new-table — Nova tabela no Supabase

Argumento: nome da tabela em snake_case (ex: `coding_sessions`)

## Checklist obrigatório

1. **Migration** — crie em `supabase/migrations/<timestamp>_<nome>.sql`

2. **SQL mínimo obrigatório:**

```sql
-- Habilitar RLS (NUNCA esquecer)
ALTER TABLE <tabela> ENABLE ROW LEVEL SECURITY;

-- Política de leitura (usuário vê só os próprios dados)
CREATE POLICY "<tabela>_select" ON <tabela>
  FOR SELECT USING (auth.uid() = user_id);

-- Política de inserção
CREATE POLICY "<tabela>_insert" ON <tabela>
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política de update
CREATE POLICY "<tabela>_update" ON <tabela>
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Política de delete
CREATE POLICY "<tabela>_delete" ON <tabela>
  FOR DELETE USING (auth.uid() = user_id);

-- Índices nas FKs e colunas mais consultadas
CREATE INDEX <tabela>_user_id_idx ON <tabela>(user_id);
```

3. **Tipos** — adicione o tipo em `lib/supabase/types.ts`:

```typescript
export type NomeTabela = {
  id: string
  user_id: string
  // ... demais campos
  created_at: string
}
```

4. **Armadilha conhecida** — NUNCA usar `.upsert()` com índice único parcial. Usar check-then-insert/update manual.

5. **Verificação** — rode `/check` antes do commit.
