![Banner image](https://user-images.githubusercontent.com/10284570/173569848-c624317f-42b1-45a6-ab09-f0ea3c247648.png)

# n8n-nodes-bullmq

This package provides nodes to interact with [BullMQ](https://docs.bullmq.io/) in n8n.

## Installation

There are two ways to install community nodes:

- Within n8n using the GUI, [find more information here](https://docs.n8n.io/integrations/community-nodes/installation/gui-install/)


- Manually from the command line: use this method if your n8n instance doesn't support installation through 
 [The n8n CLI](https://docs.n8n.io/integrations/community-nodes/installation/manual-install/)


## BullMQ 

BullMQ is a Node.js queue library that is built on top of Redis. It is a rewrite of the original Bull library, which is no longer maintained. BullMQ is a simple, fast, and reliable queue library that is suitable for a wide range of use cases.

While working with **N8N** I found that we need some way to to queue the jobs and work on them asynchronously. Since **Redis** and **BullMQ** are most lightweight and reliable solutions for this, I decided to create a set of nodes to work with **BullMQ**.

## Use Cases

- **Queueing Jobs**: You can use the BullMQ nodes to queue jobs that need to be processed asynchronously. This can be useful when you have a large number of jobs that need to be processed, but you don't want to block the main thread.
- **Workflow monitoring**: You can use the BullMQ nodes to monitor the progress of a workflow. with **bullmq-board** you can monitor the progress of the jobs in the queue.
- **Workflow rate limiting**: You can use the BullMQ nodes to rate limit the number of jobs that are processed at a time. This can be useful when you have a large number of jobs that need to be processed, but you don't want to overload the system.
- **Workflow retries**: You can use the BullMQ nodes to retry jobs that fail. This can be useful when you have jobs that are prone to failure, and you want to automatically retry them until they succeed.
- **Flow control**: You can use the BullMQ nodes to control the flow of jobs in a workflow. This can be useful when you want to ensure that jobs are processed in a specific order, or when you want to pause or resume the processing of jobs.


## Nodes

### BullMQ Trigger

Starts a workflow when a new job is added to the specified queue.

there are two modes for the trigger:
- respond immediately: the trigger will respond immediately with the job data, and mark the job as completed.
- wait for completion: the trigger will wait for the job to be completed before responding with the job data.

Notes: In order to wait for the job to be completed, we must use the **BullMQ Respond** node to mark the job as completed.

### BullMQ 

BullMQ node to add a job to the specified queue, wih the ability to pass data to the job and options.

### BullMQ Respond

BullMQ node to mark a job as completed, failed, or delayed.

Notes: The respond node requires the `jobId` and a `lockToken` to mark the job as completed, failed, or delayed. you could get those values from the **BullMQ Trigger** node.

## Contribution

I would love to see more features and nodes added to this package. If you have any ideas or suggestions, feel free to open an issue or a pull request.

## License

[LICENSE](./LICENSE)
