insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('avatars','avatars',false,5242880,array['image/jpeg','image/png','image/webp']);
create policy mobile_avatar_read on storage.objects for select to authenticated
 using(bucket_id='avatars' and split_part(name,'/',1)=(select auth.uid())::text);
create policy mobile_avatar_insert on storage.objects for insert to authenticated
 with check(bucket_id='avatars' and split_part(name,'/',1)=(select auth.uid())::text);
create policy mobile_avatar_update on storage.objects for update to authenticated
 using(bucket_id='avatars' and split_part(name,'/',1)=(select auth.uid())::text)
 with check(bucket_id='avatars' and split_part(name,'/',1)=(select auth.uid())::text);
create policy mobile_avatar_delete on storage.objects for delete to authenticated
 using(bucket_id='avatars' and split_part(name,'/',1)=(select auth.uid())::text);
