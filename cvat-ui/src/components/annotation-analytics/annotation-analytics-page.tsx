// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, {
    useCallback, useEffect, useRef, useState,
} from 'react';
import { useParams } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
import Card from 'antd/lib/card';
import Empty from 'antd/lib/empty';
import Result from 'antd/lib/result';
import Button from 'antd/lib/button';
import Badge from 'antd/lib/badge';
import Select from 'antd/lib/select';
import Space from 'antd/lib/space';
import Text from 'antd/lib/typography/Text';
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';

import { getCore } from 'cvat-core-wrapper';
import GoBackButton from 'components/common/go-back-button';
import CVATLoadingSpinner from 'components/common/loading-spinner';

const core = getCore();

interface ClassCount {
    label: string;
    count: number;
    groups?: Record<string, number>;
}

interface CountsResponse {
    task_id: number;
    total: number;
    counts: ClassCount[];
}

enum Status {
    LOADING = 'loading',
    ERROR = 'error',
    READY = 'ready',
}

enum Live {
    CONNECTING = 'connecting',
    LIVE = 'live',
    RECONNECTING = 'reconnecting',
    UNAVAILABLE = 'unavailable',
}

// Close codes the backend uses for auth/availability failures: do not reconnect.
const FATAL_WS_CODES = new Set([4401, 4403, 4404]);
const RECONNECT_DELAY_MS = 2000;
// An import saves many jobs at once: one reload is enough for that burst of notices.
const RELOAD_DELAY_MS = 300;

const GROUP_OPTIONS = [
    { value: '', label: 'No grouping' },
    { value: 'source', label: 'Source (file, manual, auto)' },
    { value: 'type', label: 'Shape type' },
];

const SERIES_COLORS = ['#1890ff', '#52c41a', '#fa8c16', '#722ed1', '#eb2f96', '#13c2c2'];

function AnnotationAnalyticsPage(): JSX.Element {
    const { tid } = useParams<{ tid: string }>();
    const taskId = +tid;

    const [status, setStatus] = useState<Status>(Status.LOADING);
    const [counts, setCounts] = useState<ClassCount[]>([]);
    const [total, setTotal] = useState(0);
    const [live, setLive] = useState<Live>(Live.CONNECTING);
    const [groupBy, setGroupBy] = useState('');

    const latestLoad = useRef(0);

    const loadCounts = useCallback(async (showSpinner = true) => {
        latestLoad.current += 1;
        const loadId = latestLoad.current;
        if (showSpinner) {
            setStatus(Status.LOADING);
        }
        try {
            const query = groupBy ? `?group_by=${groupBy}` : '';
            const url = `${core.config.backendAPI}/tasks/${taskId}/annotation-counts${query}`;
            const response = await core.server.request(url, { method: 'GET' });
            // A slower response to an earlier request must not replace a newer one.
            if (loadId === latestLoad.current) {
                const data = response.data as CountsResponse;
                setCounts(data.counts ?? []);
                setTotal(data.total ?? 0);
                setStatus(Status.READY);
            }
        } catch (error) {
            if (loadId === latestLoad.current) {
                setStatus(Status.ERROR);
            }
        }
    }, [taskId, groupBy]);

    useEffect(() => {
        loadCounts();
    }, [loadCounts]);

    // Lets the socket call the latest loadCounts without reconnecting when the grouping changes.
    const loadCountsRef = useRef(loadCounts);
    loadCountsRef.current = loadCounts;

    // Item 8/9: the socket only says when to reload; the counts always come from REST.
    useEffect(() => {
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const url = `${proto}//${window.location.host}/api/tasks/${taskId}/annotation-counts/ws`;
        let socket: WebSocket;
        let stopped = false;
        let reloadTimer: number | undefined;
        let reconnectTimer: number | undefined;

        const connect = (): void => {
            socket = new WebSocket(url);
            socket.onmessage = () => {
                setLive(Live.LIVE);
                window.clearTimeout(reloadTimer);
                reloadTimer = window.setTimeout(() => loadCountsRef.current(false), RELOAD_DELAY_MS);
            };
            socket.onclose = (event) => {
                if (stopped) {
                    return;
                }
                if (FATAL_WS_CODES.has(event.code)) {
                    setLive(Live.UNAVAILABLE);
                    return;
                }
                // Item 9: the connection dropped unexpectedly — show it and retry.
                setLive(Live.RECONNECTING);
                reconnectTimer = window.setTimeout(connect, RECONNECT_DELAY_MS);
            };
        };

        setLive(Live.CONNECTING);
        connect();

        return () => {
            stopped = true;
            window.clearTimeout(reloadTimer);
            window.clearTimeout(reconnectTimer);
            socket.close();
        };
    }, [taskId]);

    const liveBadge = {
        [Live.LIVE]: <Badge status='success' text='Live' />,
        [Live.CONNECTING]: <Badge status='processing' text='Connecting…' />,
        [Live.RECONNECTING]: <Badge status='warning' text='Reconnecting…' />,
        [Live.UNAVAILABLE]: <Badge status='error' text='Live updates unavailable' />,
    }[live];

    let body: JSX.Element;
    if (status === Status.LOADING) {
        body = <CVATLoadingSpinner />;
    } else if (status === Status.ERROR) {
        body = (
            <Result
                status='error'
                title='Could not load annotation counts'
                subTitle='The request failed. Check that the task exists and you are signed in, then try again.'
                extra={<Button type='primary' onClick={() => loadCounts()}>Retry</Button>}
            />
        );
    } else if (counts.length === 0) {
        body = <Empty description='This task has no annotations yet' />;
    } else {
        const seriesNames = [...new Set(counts.flatMap((c) => Object.keys(c.groups ?? {})))].sort();
        const stacked = seriesNames.length > 0;
        const datasets = stacked ? seriesNames.map((name, index) => ({
            label: name,
            data: counts.map((c) => c.groups?.[name] ?? 0),
            backgroundColor: SERIES_COLORS[index % SERIES_COLORS.length],
        })) : [{
            label: 'Annotations',
            data: counts.map((c) => c.count),
            backgroundColor: SERIES_COLORS[0],
        }];
        const data = { labels: counts.map((c) => c.label), datasets };
        const options = {
            responsive: true,
            plugins: { legend: { display: stacked } },
            scales: {
                x: { stacked, ticks: { autoSkip: false } },
                y: { stacked, beginAtZero: true, ticks: { precision: 0 } },
            },
        };
        body = (
            <>
                <Text strong className='cvat-annotation-analytics-total'>
                    {`Total: ${total.toLocaleString()} annotations`}
                </Text>
                <Bar data={data} options={options} />
            </>
        );
    }

    return (
        <div className='cvat-annotation-analytics-page'>
            <Row justify='center'>
                <Col span={22} xl={18} xxl={14}>
                    <Space className='cvat-annotation-analytics-header' size='large'>
                        <GoBackButton />
                        <Text className='cvat-title' strong>{`Annotation counts — task #${taskId}`}</Text>
                        {liveBadge}
                        <Select
                            className='cvat-annotation-analytics-group-by'
                            aria-label='Group by'
                            value={groupBy}
                            options={GROUP_OPTIONS}
                            onChange={setGroupBy}
                            style={{ width: 220 }}
                        />
                    </Space>
                    <Card>{body}</Card>
                </Col>
            </Row>
        </div>
    );
}

export default React.memo(AnnotationAnalyticsPage);
