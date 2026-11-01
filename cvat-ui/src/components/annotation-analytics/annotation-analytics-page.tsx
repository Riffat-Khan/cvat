// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { Row, Col } from 'antd/lib/grid';
import Card from 'antd/lib/card';
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

const BAR_COLOR = '#1890ff';

function AnnotationAnalyticsPage(): JSX.Element {
    const { tid } = useParams<{ tid: string }>();
    const taskId = +tid;

    const [loading, setLoading] = useState(true);
    const [counts, setCounts] = useState<ClassCount[]>([]);

    const loadCounts = useCallback(async () => {
        setLoading(true);
        const url = `${core.config.backendAPI}/tasks/${taskId}/annotation-counts`;
        const response = await core.server.request(url, { method: 'GET' });
        const data = response.data as CountsResponse;
        setCounts(data.counts ?? []);
        setLoading(false);
    }, [taskId]);

    useEffect(() => {
        loadCounts();
    }, [loadCounts]);

    let body: JSX.Element;
    if (loading) {
        body = <CVATLoadingSpinner />;
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
