-- Mobile starter keeps only two selected SQL Labs, independently of legacy conceptual exercises.
-- Existing class copies and teacher selections remain unchanged.
create or replace function private.mobile_init_learning() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into private.mobile_learning_settings(class_id,questions) values(new.id,private.mobile_default_questions());
 insert into private.mobile_materials(class_id,source_lesson_id,title,body,position,requires_lab)
 select new.id,l.id,l.title,replace(l.content,E'\\n',E'\n'),row_number() over(order by c.position,c.id,l.position,l.id),
 l.title in ('Memilih Baris dengan WHERE','Mengubah Record dengan UPDATE')
 from public.lessons l join public.chapters c on c.id=l.chapter_id
 where c.learning_path_id=new.source_learning_path_id and c.is_published and l.is_published;
 return new;
end $$;
