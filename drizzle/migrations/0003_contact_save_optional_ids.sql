CREATE OR REPLACE FUNCTION public.save_contact(_id uuid DEFAULT NULL, _name text DEFAULT '', _phone text DEFAULT '', _email text DEFAULT '', _notes text DEFAULT '', _groups uuid[] DEFAULT '{}') RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
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
CREATE OR REPLACE FUNCTION public.save_contact_group(_id uuid DEFAULT NULL, _name text DEFAULT '', _description text DEFAULT '', _contacts uuid[] DEFAULT '{}') RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
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