import { Link, useNavigate, useParams } from 'react-router-dom';
import { timezoneLabel } from '../auth/paths';
import { useCurrentUser } from '../auth/session';
import { isObjectId } from '../api/booking';
import { useProfessional, useSlots } from '../booking/queries';
import { FormError } from '../components/form-error';
import { Page, QueryState } from '../components/page';
import { SlotPicker } from '../components/slot-picker';

export function ProfilePage() {
  const params = useParams();
  const navigate = useNavigate();
  const session = useCurrentUser();
  const id = params.id ?? '';
  const valid = isObjectId(id);
  const professional = useProfessional(id, valid);
  const slots = useSlots(id, valid);
  const user = session.data;
  const profile = professional.data;

  if (!valid) {
    return (
      <Page title="Professional">
        <FormError message="Professional id is invalid" />
      </Page>
    );
  }

  return (
    <Page title={profile?.name ?? 'Professional'} lede={profile?.title}>
      <QueryState
        isPending={professional.isPending || slots.isPending}
        isError={professional.isError || slots.isError}
        error={professional.error ?? slots.error}
        onRetry={() => {
          void professional.refetch();
          void slots.refetch();
        }}
      >
        {profile && user ? (
          <div className="space-y-8">
            <p>
              <Link to="/" className="text-sm text-pine">
                All professionals
              </Link>
            </p>
            <p className="max-w-2xl text-lg">{profile.bio}</p>
            <p className="text-sm text-mist">Works in {timezoneLabel(profile.timezone)}.</p>
            <section>
              <h2 className="font-serif text-2xl">Open times</h2>
              <p className="mt-2 mb-4 text-mist">The next 4 weeks.</p>
              <SlotPicker
                slots={slots.data ?? []}
                timeZone={user.timezone}
                onSelect={(slot) => {
                  void navigate(
                    `/professionals/${id}/book?start=${encodeURIComponent(slot.startAt)}`,
                  );
                }}
                emptyMessage="No open times in the next 4 weeks."
              />
            </section>
          </div>
        ) : null}
      </QueryState>
    </Page>
  );
}
