// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
import Card from 'antd/lib/card';
import Empty from 'antd/lib/empty';
import Result from 'antd/lib/result';
import Button from 'antd/lib/button';
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
}

interface CountsResponse {
    task_id: number;
    counts: ClassCount[];
}

enum Status {
    LOADING = 'loading',
    ERROR = 'error',
    READY = 'ready',
}

const BAR_COLOR = '#1890ff';

function AnnotationAnalyticsPage(): JSX.Element {
    const { tid } = useParams<{ tid: string }>();
    const taskId = +tid;

    const [status, setStatus] = useState<Status>(Status.LOADING);
    const [counts, setCounts] = useState<ClassCount[]>([]);

    const loadCounts = useCallback(async () => {
        setStatus(Status.LOADING);
        try {
            const url = `${core.config.backendAPI}/tasks/${taskId}/annotation-counts`;
            const response = await core.server.request(url, { method: 'GET' });
            const data = response.data as CountsResponse;
            setCounts(data.counts ?? []);
            setStatus(Status.READY);
        } catch (error) {
            setStatus(Status.ERROR);
        }
    }, [taskId]);

    useEffect(() => {
        loadCounts();
    }, [loadCounts]);

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
        const data = {
            labels: counts.map((c) => c.label),
            datasets: [{
                label: 'Annotations',
                data: counts.map((c) => c.count),
                backgroundColor: BAR_COLOR,
            }],
        };
        const options = {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { autoSkip: false } },
                y: { beginAtZero: true, ticks: { precision: 0 } },
            },
        };
        body = <Bar data={data} options={options} />;
    }

    return (
        <div className='cvat-annotation-analytics-page'>
            <Row justify='center'>
                <Col span={22} xl={18} xxl={14}>
                    <Space className='cvat-annotation-analytics-header' size='large'>
                        <GoBackButton />
                        <Text className='cvat-title' strong>{`Annotation counts — task #${taskId}`}</Text>
                    </Space>
                    <Card>{body}</Card>
                </Col>
            </Row>
        </div>
    );
}

export default React.memo(AnnotationAnalyticsPage);
