'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { StatsCard, DataTable, Column } from '@/components/admin';
import { EVENT_STATUSES } from '@/lib/admin/constants';

interface EventDetail {
  event: {
    id: string;
    title: string;
    description: string | null;
    start_at: string;
    end_at: string;
    banner_url: string | null;
    event_type: string;
    status: string;
    created_at: string;
  };
  participants: Array<{
    user_id: string;
    joined_at: string;
    completion_data: Record<string, unknown>;
    users: {
      country_code: string | null;
      timezone: string | null;
    };
  }>;
}

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const token = localStorage.getItem('admin_token');
        const response = await fetch(`/api/admin/events/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          if (response.status === 404) {
            router.replace('/admin/events');
            return;
          }
          throw new Error('Failed to fetch event');
        }

        const eventData = await response.json();
        setData(eventData);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id, router]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-zinc-800 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-zinc-800 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="text-zinc-500">Event not found</div>;
  }

  const { event, participants } = data;

  const statusConfig = EVENT_STATUSES.find((s) => s.value === event.status);
  const now = new Date();
  const startDate = new Date(event.start_at);
  const endDate = new Date(event.end_at);

  const isUpcoming = now < startDate;
  const isOngoing = now >= startDate && now <= endDate;
  const isEnded = now > endDate;

  const columns: Column<(typeof participants)[0]>[] = [
    {
      key: 'user_id',
      header: 'User ID',
      render: (p) => (
        <span className="font-mono text-xs text-zinc-400">
          {p.user_id.slice(0, 8)}...
        </span>
      ),
    },
    {
      key: 'users.country_code',
      header: 'Country',
      render: (p) => p.users?.country_code || '-',
    },
    {
      key: 'joined_at',
      header: 'Joined',
      render: (p) => new Date(p.joined_at).toLocaleDateString(),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.back()}
            className="text-zinc-400 hover:text-white mb-2 flex items-center gap-1"
          >
            ← Back to Events
          </button>
          <h1 className="text-2xl font-bold text-white">{event.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`px-2 py-1 rounded-full text-xs ${statusConfig?.color || 'bg-gray-500'} text-white`}>
              {statusConfig?.label || event.status}
            </span>
            <span className="text-zinc-500 text-sm">{event.event_type}</span>
          </div>
        </div>
        <button
          onClick={() => router.push(`/admin/events`)}
          className="px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"
        >
          Edit Event
        </button>
      </div>

      {/* Banner */}
      {event.banner_url && (
        <div className="rounded-xl overflow-hidden border border-zinc-800">
          <img
            src={event.banner_url}
            alt={event.title}
            className="w-full h-48 object-cover"
          />
        </div>
      )}

      {/* Event Info */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Event Details</h2>

        {event.description && (
          <p className="text-zinc-300 mb-6">{event.description}</p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-zinc-500 text-sm">Start Date</p>
            <p className="text-white">{startDate.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-zinc-500 text-sm">End Date</p>
            <p className="text-white">{endDate.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-zinc-500 text-sm">Timeline</p>
            <p className={`${isOngoing ? 'text-green-400' : isUpcoming ? 'text-yellow-400' : 'text-zinc-400'}`}>
              {isOngoing ? 'Ongoing' : isUpcoming ? 'Upcoming' : 'Ended'}
            </p>
          </div>
          <div>
            <p className="text-zinc-500 text-sm">Created</p>
            <p className="text-white">{new Date(event.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="Total Participants"
          value={participants.length}
          icon="👥"
          color="blue"
        />
        <StatsCard
          title="Duration"
          value={`${Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))} days`}
          icon="📅"
          color="purple"
        />
        <StatsCard
          title="Time Remaining"
          value={isEnded ? 'Ended' : isUpcoming ? 'Not started' : `${Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))} days`}
          icon="⏰"
          color={isOngoing ? 'green' : 'yellow'}
        />
      </div>

      {/* Participants */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Participants</h2>
        <DataTable
          data={participants}
          columns={columns}
          keyField="user_id"
          emptyMessage="No participants yet"
        />
      </div>
    </div>
  );
}
