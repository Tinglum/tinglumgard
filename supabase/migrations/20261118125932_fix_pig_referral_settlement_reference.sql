-- Correct the zero-value settlement idempotency reference.
CREATE OR REPLACE FUNCTION public.redeem_paid_pig_referrals(p_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE
  target public.orders%ROWTYPE;
  personal_code public.referral_codes%ROWTYPE;
  friend record;
  seen_phones text[] := ARRAY[]::text[];
  seen_emails text[] := ARRAY[]::text[];
  clean_phone text;
  clean_email text;
  friends integer := 0;
  box_price numeric;
  box_balance numeric;
  per_friend numeric;
  award numeric;
  newly_applied numeric := 0;
BEGIN
  SELECT * INTO STRICT target FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF target.status='cancelled' OR NOT EXISTS (
    SELECT 1 FROM public.payments WHERE order_id=target.id AND payment_type='deposit' AND status='completed'
  ) THEN RAISE EXCEPTION 'A completed deposit is required'; END IF;

  SELECT * INTO personal_code FROM public.referral_codes
  WHERE order_id=target.id AND is_active=true
    AND (owner_phone=target.customer_phone OR lower(owner_email)=lower(target.customer_email))
  ORDER BY created_at,id LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('remainder_amount',target.remainder_amount,'total_amount',target.total_amount,'new_credit',0,'settled',false);
  END IF;
  IF EXISTS (SELECT 1 FROM public.payments WHERE order_id=target.id AND payment_type='remainder' AND status='completed') THEN
    RETURN jsonb_build_object('remainder_amount',target.remainder_amount,'total_amount',target.total_amount,'new_credit',0,'settled',true);
  END IF;

  box_price := COALESCE(target.box_price_nok,
    2*(target.deposit_amount+greatest(COALESCE(target.referral_discount_amount,0),COALESCE(target.rebate_discount_amount,0))));
  box_balance := box_price-round(box_price/2);
  per_friend := round(box_price*0.10);

  FOR friend IN
    SELECT r.* FROM public.referrals r JOIN public.orders o ON o.id=r.order_id
    WHERE r.referral_code_id=personal_code.id AND o.status NOT IN ('draft','cancelled')
      AND EXISTS (SELECT 1 FROM public.payments p WHERE p.order_id=o.id AND p.payment_type='deposit' AND p.status='completed')
    ORDER BY r.created_at,r.id FOR UPDATE OF r
  LOOP
    clean_phone := regexp_replace(COALESCE(friend.referee_phone,''),'[^0-9]','','g');
    clean_phone := regexp_replace(clean_phone,'^(0047|47)(?=[0-9]{8}$)','');
    clean_email := lower(trim(COALESCE(friend.referee_email,'')));
    IF (clean_phone='' AND clean_email='') OR (clean_phone<>'' AND clean_phone=ANY(seen_phones)) OR (clean_email<>'' AND clean_email=ANY(seen_emails)) THEN CONTINUE; END IF;
    IF (clean_phone<>'' AND clean_phone=regexp_replace(regexp_replace(COALESCE(target.customer_phone,''),'[^0-9]','','g'),'^(0047|47)(?=[0-9]{8}$)','')) OR (clean_email<>'' AND clean_email=lower(target.customer_email)) THEN CONTINUE; END IF;
    seen_phones := array_append(seen_phones,clean_phone);
    seen_emails := array_append(seen_emails,clean_email);
    friends := friends+1;
    IF friends>5 THEN EXIT; END IF;
    IF friend.credit_applied THEN CONTINUE; END IF;
    award := greatest(0,least(per_friend,box_balance-target.referral_credit_applied_nok-newly_applied,target.remainder_amount-newly_applied));
    IF award=0 THEN CONTINUE; END IF;
    -- Existing tracking credits are corrected to the referrer's own box price
    -- before the existing apply-credit trigger consumes them.
    UPDATE public.referral_codes SET
      total_credits_earned=total_credits_earned+award-friend.credit_amount_nok,
      credits_available=credits_available+award-friend.credit_amount_nok
      WHERE id=personal_code.id;
    UPDATE public.referrals SET credit_amount_nok=award,credit_applied=true,
      credit_applied_to_order_id=target.id,credit_applied_at=now() WHERE id=friend.id;
    newly_applied := newly_applied+award;
  END LOOP;
  IF newly_applied>0 THEN
    UPDATE public.orders SET remainder_amount=remainder_amount-newly_applied,
      total_amount=total_amount-newly_applied,
      referral_credit_applied_nok=referral_credit_applied_nok+newly_applied
      WHERE id=target.id RETURNING * INTO target;
  END IF;
  IF target.remainder_amount=0 THEN
    INSERT INTO public.payments(order_id,payment_type,amount_nok,status,idempotency_key,paid_at)
      VALUES(target.id,'remainder',0,'completed','REF-'||target.id::text,now())
      ON CONFLICT (idempotency_key) DO NOTHING;
    UPDATE public.orders SET status='paid' WHERE id=target.id;
  END IF;
  RETURN jsonb_build_object('remainder_amount',target.remainder_amount,'total_amount',target.total_amount,
    'new_credit',newly_applied,'settled',target.remainder_amount=0);
END;
$$;
REVOKE ALL ON FUNCTION public.redeem_paid_pig_referrals(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_paid_pig_referrals(uuid) TO service_role;
