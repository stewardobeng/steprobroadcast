CREATE TABLE public.contacts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL,
 phone text NOT NULL UNIQUE,
 email text NOT NULL DEFAULT '',
 notes text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT ALL ON public.contacts TO service_role;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage contacts" ON public.contacts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TABLE public.contact_groups (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL UNIQUE,
 description text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_groups TO authenticated;
GRANT ALL ON public.contact_groups TO service_role;
ALTER TABLE public.contact_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage contact groups" ON public.contact_groups FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TABLE public.contact_group_members (
 contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
 group_id uuid NOT NULL REFERENCES public.contact_groups(id) ON DELETE CASCADE,
 PRIMARY KEY (contact_id, group_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_group_members TO authenticated;
GRANT ALL ON public.contact_group_members TO service_role;
ALTER TABLE public.contact_group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage group members" ON public.contact_group_members FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX contact_group_members_group_idx ON public.contact_group_members(group_id);
CREATE FUNCTION public.save_contact(_id uuid, _name text, _phone text, _email text, _notes text, _groups uuid[]) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE saved_id uuid;
BEGIN
 IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Administrator access required'; END IF;
 IF _id IS NULL THEN
  INSERT INTO public.contacts(name, phone, email, notes) VALUES (_name, _phone, _email, _notes) RETURNING id INTO saved_id;
 ELSE
  UPDATE public.contacts SET name = _name, phone = _phone, email = _email, notes = _notes, updated_at = now() WHERE id = _id RETURNING id INTO saved_id;
  IF saved_id IS NULL THEN RAISE EXCEPTION 'Contact not found'; END IF;
 END IF;
 DELETE FROM public.contact_group_members WHERE contact_id = saved_id;
 INSERT INTO public.contact_group_members(contact_id, group_id) SELECT saved_id, g FROM unnest(_groups) AS g;
 RETURN saved_id;
END;
$$;
REVOKE ALL ON FUNCTION public.save_contact(uuid, text, text, text, text, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_contact(uuid, text, text, text, text, uuid[]) TO authenticated, service_role;
CREATE FUNCTION public.save_contact_group(_id uuid, _name text, _description text, _contacts uuid[]) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE saved_id uuid;
BEGIN
 IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Administrator access required'; END IF;
 IF _id IS NULL THEN
  INSERT INTO public.contact_groups(name, description) VALUES (_name, _description) RETURNING id INTO saved_id;
 ELSE
  UPDATE public.contact_groups SET name = _name, description = _description, updated_at = now() WHERE id = _id RETURNING id INTO saved_id;
  IF saved_id IS NULL THEN RAISE EXCEPTION 'Group not found'; END IF;
 END IF;
 DELETE FROM public.contact_group_members WHERE group_id = saved_id;
 INSERT INTO public.contact_group_members(contact_id, group_id) SELECT c, saved_id FROM unnest(_contacts) AS c;
 RETURN saved_id;
END;
$$;
REVOKE ALL ON FUNCTION public.save_contact_group(uuid, text, text, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_contact_group(uuid, text, text, uuid[]) TO authenticated, service_role;