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
          <div className="space-y-5">
            <Link to="/" className="text-sm font-medium text-pine">
              All professionals
            </Link>
            <div className="rounded-2xl border border-line bg-card p-5">
              <p className="max-w-2xl text-sm leading-6">{profile.bio}</p>
              <p className="mt-3 text-sm text-mist">Works in {timezoneLabel(profile.timezone)}.</p>
            </div>
            <section>
              <h2 className="text-lg font-semibold">Open times</h2>
              <p className="mt-1 mb-3 text-sm text-mist">The next 4 weeks.</p>
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
