-- Transactional integration check. Creates only uncommitted test records,
-- calls no payment provider, and rolls every fixture back.
BEGIN;
DO $$
DECLARE
  preset uuid;
  owner_id uuid;
  friend_id uuid;
  personal_code uuid;
  run text := upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
  response jsonb;
  i integer;
  payment_count integer;
BEGIN
  SELECT id INTO STRICT preset FROM public.mangalitsa_box_presets WHERE slug='familieboks' LIMIT 1;
  INSERT INTO public.orders(order_number,box_size,mangalitsa_preset_id,is_mangalitsa,status,deposit_amount,remainder_amount,total_amount,box_price_nok,customer_name,customer_email,customer_phone,delivery_type)
  VALUES('QA-'||run,NULL,preset,true,'deposit_paid',1085,1750,2835,3100,'Uncommitted test customer','qa-owner@example.invalid','QAOWNER-'||run,'pickup_oslo') RETURNING id INTO owner_id;
  INSERT INTO public.payments(order_id,payment_type,amount_nok,status,idempotency_key,paid_at)
  VALUES(owner_id,'deposit',1085,'completed','QA-OWNER-'||run,now());
  INSERT INTO public.referral_codes(code,owner_phone,owner_email,order_id,is_active,max_uses)
  VALUES('QA'||run,'QAOWNER-'||run,'qa-owner@example.invalid',owner_id,true,5) RETURNING id INTO personal_code;

  FOR i IN 1..5 LOOP
    INSERT INTO public.orders(order_number,box_size,mangalitsa_preset_id,is_mangalitsa,status,deposit_amount,remainder_amount,total_amount,box_price_nok,customer_name,customer_email,customer_phone,delivery_type)
    VALUES('QA-'||run||'-'||i,NULL,preset,true,'deposit_paid',1085,1550,2635,3100,'Uncommitted test friend','qa-friend-'||i||'@example.invalid','QAFRIEND-'||run||'-'||i,'pickup_farm') RETURNING id INTO friend_id;
    INSERT INTO public.referrals(referral_code_id,referrer_phone,referee_phone,order_id,order_number,discount_percentage,discount_amount_nok,credit_percentage,credit_amount_nok,referee_email)
    VALUES(personal_code,'QAOWNER-'||run,'QAFRIEND-'||run||'-'||i,friend_id,'QA-'||run||'-'||i,30,465,20,310,'qa-friend-'||i||'@example.invalid');
    INSERT INTO public.payments(order_id,payment_type,amount_nok,status,idempotency_key)
    VALUES(friend_id,'deposit',1085,'pending','QA-FRIEND-'||run||'-'||i);
    response := public.redeem_paid_pig_referrals(owner_id);
    ASSERT (response->>'new_credit')::numeric=0,'Unpaid referral must not earn credit';
    UPDATE public.payments SET status='completed',paid_at=now() WHERE order_id=friend_id;
    IF i=2 THEN
      UPDATE public.orders SET status='cancelled' WHERE id=friend_id;
      response := public.redeem_paid_pig_referrals(owner_id);
      ASSERT (response->>'new_credit')::numeric=0,'Cancelled referral must not earn credit';
      UPDATE public.orders SET status='deposit_paid' WHERE id=friend_id;
    END IF;
    response := public.redeem_paid_pig_referrals(owner_id);
    ASSERT (response->>'new_credit')::numeric=310,'One qualifying friend must earn 10% of original box price';
    ASSERT (response->>'remainder_amount')::numeric=1750-310*i,'Balance must match the advertised calculation';
    response := public.redeem_paid_pig_referrals(owner_id);
    ASSERT (response->>'new_credit')::numeric=0,'Retry must not apply credit twice';
  END LOOP;
  ASSERT (response->>'remainder_amount')::numeric=200,'Referral bonus must not pay transport';
  ASSERT (SELECT referral_credit_applied_nok FROM public.orders WHERE id=owner_id)=1550,'Five-friend credit must be capped at box remainder';
  -- Removing transport simulates switching to free farm collection.
  UPDATE public.orders SET delivery_type='pickup_farm',remainder_amount=remainder_amount-200,total_amount=total_amount-200 WHERE id=owner_id;
  response := public.redeem_paid_pig_referrals(owner_id);
  ASSERT (response->>'settled')::boolean,'Five friends must settle the box without another cash payment';
  ASSERT (SELECT status FROM public.orders WHERE id=owner_id)='paid','Zero remainder must mark order paid';
  ASSERT (SELECT total_amount FROM public.orders WHERE id=owner_id)=1085,'Own final price must be 35% of original box price';
  PERFORM public.redeem_paid_pig_referrals(owner_id);
  SELECT count(*) INTO payment_count FROM public.payments WHERE order_id=owner_id AND payment_type='remainder' AND amount_nok=0 AND status='completed';
  ASSERT payment_count=1,'Zero-value settlement must be idempotent';
  ASSERT NOT has_function_privilege('anon','public.redeem_paid_pig_referrals(uuid)','EXECUTE'),'Anonymous users must not redeem credits';
  ASSERT NOT has_function_privilege('authenticated','public.redeem_paid_pig_referrals(uuid)','EXECUTE'),'Browser clients must not redeem credits directly';
  ASSERT has_function_privilege('service_role','public.redeem_paid_pig_referrals(uuid)','EXECUTE'),'Server must be able to redeem credits';
END;
$$;
ROLLBACK;
SELECT 'Passed: unpaid/cancelled exclusion, 0–5 friend amounts, transport exclusion, retry safety, zero settlement, and RPC privileges. All fixtures rolled back.' AS result;
